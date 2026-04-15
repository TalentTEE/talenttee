import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import bs58 from 'bs58';
import { NegotiationSession } from '../entities/negotiation-session.entity.js';
import { NegotiationRound } from '../entities/negotiation-round.entity.js';
import { JobPosting } from '../entities/job-posting.entity.js';
import { User } from '../entities/user.entity.js';
import { NegotiationState, NegotiationActor, NegotiationDecision } from '../common/enums/index.js';
import type { AgentResponse, NegotiationBoundary } from '../common/types/index.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/near-ai-client.interface.js';
import type { NearAiClient } from '../common/interfaces/near-ai-client.interface.js';
import { MATCH_RESULT_QUERY } from '../common/interfaces/match-result-query.interface.js';
import type { MatchResultQuery } from '../common/interfaces/match-result-query.interface.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { getActorForState, transition, isTerminal } from './negotiation-engine.js';
import { buildSeekerPrompt } from './prompts/seeker-agent.en.prompt.js';
import { buildEmployerPrompt } from './prompts/employer-agent.en.prompt.js';

@Injectable()
export class NegotiationService {
  private readonly logger = new Logger(NegotiationService.name);
  private interventions = new Map<string, string>();

  constructor(
    @InjectRepository(NegotiationSession)
    private readonly sessionRepo: Repository<NegotiationSession>,
    @InjectRepository(NegotiationRound)
    private readonly roundRepo: Repository<NegotiationRound>,
    @InjectRepository(JobPosting)
    private readonly jobRepo: Repository<JobPosting>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(NEAR_AI_CLIENT)
    private readonly aiClient: NearAiClient,
    @Inject(MATCH_RESULT_QUERY)
    private readonly matchQuery: MatchResultQuery,
    private readonly cryptoService: CryptoService,
  ) {}

  async listSessions(userId: string): Promise<NegotiationSession[]> {
    return this.sessionRepo.find({
      where: [{ seekerId: userId }, { employerId: userId }],
      relations: ['job', 'seeker', 'employer'],
      order: { updatedAt: 'DESC' },
    });
  }

  async createSession(jobId: string, seekerId: string, maxRounds = 5): Promise<NegotiationSession> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const session = this.sessionRepo.create({
      jobId,
      seekerId,
      employerId: job.employerId,
      state: NegotiationState.INITIATED,
      currentRound: 0,
      maxRounds,
      sessionKeyNonce: randomUUID(),
    });
    return this.sessionRepo.save(session);
  }

  async startNegotiation(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session.state !== NegotiationState.INITIATED) {
      throw new ConflictException('Session already started or finished');
    }
    // Transition to first state
    session.state = NegotiationState.EMPLOYER_OFFER;
    session.currentRound = 1;
    await this.sessionRepo.save(session);

    // Fire and forget — runs in background
    this.executeRounds(session).catch(err => {
      this.logger.error(`Negotiation ${sessionId} failed unexpectedly`, err);
    });
  }

  async getSession(id: string): Promise<NegotiationSession> {
    const session = await this.sessionRepo.findOne({
      where: { id },
      relations: ['job', 'seeker', 'employer'],
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async getRounds(sessionId: string): Promise<NegotiationRound[]> {
    return this.roundRepo.find({
      where: { sessionId },
      order: { round: 'ASC' },
    });
  }

  async intervene(sessionId: string, userId: string, direction: string): Promise<void> {
    const session = await this.getSession(sessionId);
    const role = session.seekerId === userId ? 'SEEKER' : 'EMPLOYER';
    // NOTE: In-memory only — lost on server restart
    this.interventions.set(`${sessionId}:${role}`, direction);
  }

  private parsePublicKey(key: string): Uint8Array {
    if (key.startsWith('ed25519:')) {
      return bs58.decode(key.slice(8));
    }
    return Buffer.from(key, 'hex');
  }

  private async executeRounds(session: NegotiationSession): Promise<void> {
    // Reload with relations
    session = await this.getSession(session.id);
    const job = session.job;
    const seeker = session.seeker;

    if (!job || !seeker) {
      this.logger.error(`Session ${session.id} missing job or seeker relation`);
      session.state = NegotiationState.FAILED;
      await this.sessionRepo.save(session);
      return;
    }

    // Derive session encryption key
    const seekerPubKey = this.parsePublicKey(seeker.publicKey);
    const sessionKey = this.cryptoService.deriveServerSessionKey(seekerPubKey, session.sessionKeyNonce);

    const seekerProfile = await this.matchQuery.getSeekerProfile(session.seekerId);
    const boundary: NegotiationBoundary = {
      salaryMin: 0, salaryMax: 0, salaryHardMax: 0,
      remotePolicyOptions: [], nonNegotiableItems: [], flexibleItems: [],
      negotiationStyle: 'moderate',
      ...((job.negotiationBoundary || {}) as Partial<NegotiationBoundary>),
    };
    const roundHistory: AgentResponse[] = [];

    while (!isTerminal(session.state)) {
      try {
        const actor = getActorForState(session.state);
        const role = actor === NegotiationActor.EMPLOYER_AGENT ? 'EMPLOYER' : 'SEEKER';
        const intervention = this.interventions.get(`${session.id}:${role}`) || null;

        // Build prompt based on actor
        let systemPrompt: string;
        const historyStr = roundHistory.length > 0
          ? roundHistory.map(r => `Round ${r.round} (${r.actor}): ${r.decision} — salary ${r.proposal.salary}`).join('\n')
          : 'This is the first round.';
        const lastOffer = roundHistory.length > 0
          ? JSON.stringify(roundHistory[roundHistory.length - 1].proposal)
          : 'No initial offer';

        if (actor === NegotiationActor.EMPLOYER_AGENT) {
          systemPrompt = buildEmployerPrompt({
            jobTitle: job.title,
            jobDescription: job.description,
            boundary,
            negotiationHistory: historyStr,
            currentCounter: lastOffer,
            userIntervention: intervention,
            round: session.currentRound,
          });
        } else {
          systemPrompt = buildSeekerPrompt({
            resumeData: seekerProfile.resumeData,
            marketValueMin: seekerProfile.marketValueMin,
            marketValueMax: seekerProfile.marketValueMax,
            strengths: seekerProfile.strengths,
            weaknesses: seekerProfile.weaknesses,
            preferences: seekerProfile.preferences,
            negotiationHistory: historyStr,
            currentOffer: lastOffer,
            userIntervention: intervention,
            round: session.currentRound,
          });
        }

        const result = await this.aiClient.chat({
          agentId: actor === NegotiationActor.EMPLOYER_AGENT ? 'employer-agent' : 'seeker-agent',
          systemPrompt,
          userMessage: `Please proceed with round ${session.currentRound}.`,
        });

        let parsed: AgentResponse;
        try {
          parsed = JSON.parse(result.content);
        } catch {
          this.logger.warn(`Session ${session.id} round ${session.currentRound}: JSON parse failed, retrying`);
          const retry = await this.aiClient.chat({
            agentId: actor === NegotiationActor.EMPLOYER_AGENT ? 'employer-agent' : 'seeker-agent',
            systemPrompt,
            userMessage: `Previous response was not valid JSON. Please respond only in JSON format. Round ${session.currentRound}`,
          });
          parsed = JSON.parse(retry.content);
        }
        roundHistory.push(parsed);

        // Encrypt and save round
        const encrypted = this.cryptoService.encrypt(sessionKey, JSON.stringify(parsed));
        const round = this.roundRepo.create({
          sessionId: session.id,
          round: session.currentRound,
          actor: parsed.actor as NegotiationActor,
          encryptedData: encrypted,
          decision: parsed.decision as NegotiationDecision,
        });
        await this.roundRepo.save(round);

        // State transition
        const decision = parsed.decision as NegotiationDecision;
        const nextState = transition(session.state, decision, session.currentRound, session.maxRounds);
        session.state = nextState;
        if (!isTerminal(nextState)) {
          session.currentRound += 1;
        }
        await this.sessionRepo.save(session);

        // Clear intervention after use
        if (intervention) {
          this.interventions.delete(`${session.id}:${role}`);
        }

        this.logger.log(`Session ${session.id} round ${round.round}: ${parsed.decision} → ${nextState}`);
      } catch (err) {
        this.logger.error(`Session ${session.id} round ${session.currentRound} failed`, err);
        session.state = NegotiationState.FAILED;
        await this.sessionRepo.save(session);
        break;
      }
    }

    this.logger.log(`Session ${session.id} finished: ${session.state}`);
  }

  async getDecryptedRounds(sessionId: string): Promise<any[]> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['seeker'],
    });
    if (!session) throw new NotFoundException('Session not found');
    if (!session.seeker?.publicKey) throw new NotFoundException('Seeker public key not found');

    const seekerPubKey = this.parsePublicKey(session.seeker.publicKey);
    const sessionKey = this.cryptoService.deriveServerSessionKey(seekerPubKey, session.sessionKeyNonce);

    const rounds = await this.getRounds(sessionId);
    return rounds.map(round => {
      try {
        const decrypted = this.cryptoService.decrypt(sessionKey, round.encryptedData);
        const data = JSON.parse(decrypted);
        return {
          id: round.id,
          sessionId: round.sessionId,
          round: round.round,
          actor: round.actor,
          proposal: data.proposal,
          reasoning: data.reasoning,
          decision: round.decision,
        };
      } catch {
        return {
          id: round.id,
          sessionId: round.sessionId,
          round: round.round,
          actor: round.actor,
          proposal: null,
          reasoning: 'Decryption failed',
          decision: round.decision,
        };
      }
    });
  }

  async decryptRounds(sessionId: string, sessionKeyHex: string): Promise<any[]> {
    const rounds = await this.getRounds(sessionId);
    const sessionKey = Buffer.from(sessionKeyHex, 'hex');
    return rounds.map(round => {
      try {
        const decrypted = this.cryptoService.decrypt(sessionKey, round.encryptedData);
        return {
          round: round.round,
          actor: round.actor,
          decision: round.decision,
          data: JSON.parse(decrypted),
          timestamp: round.timestamp,
        };
      } catch {
        return {
          round: round.round,
          actor: round.actor,
          decision: round.decision,
          data: null,
          error: 'Decryption failed — invalid session key',
          timestamp: round.timestamp,
        };
      }
    });
  }
}
