import { Injectable, Inject, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { MatchResult } from '../entities/match-result.entity.js';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { JobPosting } from '../entities/job-posting.entity.js';
import { User } from '../entities/user.entity.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/near-ai-client.interface.js';
import type { NearAiClient } from '../common/interfaces/near-ai-client.interface.js';
import { NEGOTIATION_HANDOFF } from '../common/interfaces/negotiation-handoff.interface.js';
import type { NegotiationHandoff } from '../common/interfaces/negotiation-handoff.interface.js';
import { MATCH_EVENTS } from '../common/events/match.events.js';
import type { ResumeCompletedEvent, JobCreatedEvent, JobSeekingOnEvent } from '../common/events/match.events.js';
import { ResumeService } from '../resume/resume.service.js';

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    @InjectRepository(MatchResult)
    private readonly matchRepo: Repository<MatchResult>,
    @InjectRepository(JobPosting)
    private readonly jobRepo: Repository<JobPosting>,
    @InjectRepository(ResumeProfile)
    private readonly resumeRepo: Repository<ResumeProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(NEAR_AI_CLIENT)
    private readonly aiClient: NearAiClient,
    @Inject(NEGOTIATION_HANDOFF)
    private readonly negotiationHandoff: NegotiationHandoff,
    private readonly resumeService: ResumeService,
    private readonly dataSource: DataSource,
  ) {}

  /* ---------------------------------------------------------- *
   * Event listeners — fire-and-forget auto-matching
   * ---------------------------------------------------------- */

  @OnEvent(MATCH_EVENTS.RESUME_COMPLETED)
  async onResumeCompleted(event: ResumeCompletedEvent): Promise<void> {
    try {
      this.logger.log(`[Event] Resume completed for seeker ${event.seekerId}, triggering match...`);
      await this.matchForSeeker(event.seekerId);
    } catch (err) {
      this.logger.error(`[Event] matchForSeeker failed for ${event.seekerId}: ${err}`);
    }
  }

  @OnEvent(MATCH_EVENTS.JOB_CREATED)
  async onJobCreated(event: JobCreatedEvent): Promise<void> {
    try {
      this.logger.log(`[Event] Job created ${event.jobId}, triggering match...`);
      await this.matchForJob(event.jobId);
    } catch (err) {
      this.logger.error(`[Event] matchForJob failed for ${event.jobId}: ${err}`);
    }
  }

  @OnEvent(MATCH_EVENTS.JOB_SEEKING_ON)
  async onJobSeekingOn(event: JobSeekingOnEvent): Promise<void> {
    try {
      this.logger.log(`[Event] Job seeking ON for seeker ${event.seekerId}, triggering match...`);
      await this.matchForSeeker(event.seekerId);
    } catch (err) {
      this.logger.error(`[Event] matchForSeeker failed for ${event.seekerId}: ${err}`);
    }
  }

  /* ---------------------------------------------------------- *
   * Cron — periodic re-match every 6 hours
   * ---------------------------------------------------------- */

  @Cron('0 */6 * * *')
  async cronMatchAll(): Promise<void> {
    this.logger.log('[Cron] Starting periodic match for all active seekers...');
    const activeSeekers = await this.userRepo.find({ where: { jobSeeking: true, role: 'SEEKER' as any } });
    for (const seeker of activeSeekers) {
      const resume = await this.resumeRepo.findOne({ where: { userId: seeker.id } });
      if (!resume || resume.status !== 'COMPLETE' || !resume.embedding) continue;
      try {
        await this.matchForSeeker(seeker.id);
      } catch (err) {
        this.logger.error(`[Cron] matchForSeeker failed for ${seeker.id}: ${err}`);
      }
    }
    this.logger.log('[Cron] Periodic match complete.');
  }

  async matchForSeeker(seekerId: string, limit = 5) {
    const resume = await this.resumeRepo.findOne({ where: { userId: seekerId } });
    if (!resume || !resume.embedding) {
      throw new NotFoundException('Resume or embedding not found. Please generate a resume first.');
    }

    // Step 1: ANN — pgvector cosine similarity Top-20
    const annResults = await this.dataSource.query(
      `SELECT jp.id, jp.title, jp.description, jp.required_skills,
              jp.salary_min, jp.salary_max, jp.employer_id,
              1 - (jp.embedding::vector <=> $1::vector) as ann_score
       FROM job_posting jp
       WHERE jp.embedding IS NOT NULL AND jp.status = 'ACTIVE'
       ORDER BY jp.embedding::vector <=> $1::vector
       LIMIT 20`,
      [resume.embedding],
    );

    if (annResults.length === 0) return [];

    // Step 1.5: Hard filters — salary overlap + skill coverage
    const filtered = annResults.filter(
      (j: any) =>
        this.salaryOverlaps(resume.marketValueMin, resume.marketValueMax, j.salary_min, j.salary_max) &&
        this.skillCoverageOk(resume.skills, j.required_skills),
    );
    if (filtered.length === 0) return [];

    // Step 2: Reranker
    const resumeText = this.resumeService.buildResumeText(resume);
    const jobTexts = filtered.map(
      (j: any) => `${j.title} | ${j.description} | Skills: ${(j.required_skills ?? []).join(', ')}`,
    );

    const rerankResults = await this.aiClient.rerank(resumeText, jobTexts, limit);

    // Step 3: Save MatchResults (skip rerank score < 0.5)
    const matches: MatchResult[] = [];
    let finalRank = 0;
    for (const rr of rerankResults) {
      if (rr.score < 0.5) continue;
      finalRank++;
      const job = filtered[rr.index];

      const existing = await this.matchRepo.findOne({
        where: { seekerId, jobId: job.id },
      });

      if (existing) {
        existing.annScore = job.ann_score;
        existing.rerankScore = rr.score;
        existing.finalRank = finalRank;
        matches.push(await this.matchRepo.save(existing));
      } else {
        const match = this.matchRepo.create({
          seekerId,
          jobId: job.id,
          annScore: job.ann_score,
          rerankScore: rr.score,
          finalRank,
        });
        matches.push(await this.matchRepo.save(match));
      }
    }

    // Step 4: Auto-negotiate for all passing matches
    for (const match of matches) {
      if (!match.negotiationSessionId) {
        const job = filtered.find((j: any) => j.id === match.jobId);
        if (job) await this.autoNegotiate(match, job.employer_id);
      }
    }

    return this.getCachedSeekerMatches(seekerId);
  }

  async getCachedSeekerMatches(seekerId: string) {
    const results = await this.matchRepo.find({
      where: { seekerId },
      relations: ['job', 'job.employer'],
      order: { finalRank: 'ASC' },
    });

    return results.map((m) => ({
      id: m.id,
      seekerId: m.seekerId,
      jobId: m.jobId,
      annScore: m.annScore,
      rerankScore: m.rerankScore,
      finalRank: m.finalRank,
      seekerAgreed: m.seekerAgreed,
      employerAgreed: m.employerAgreed,
      negotiationSessionId: m.negotiationSessionId,
      jobTitle: m.job?.title ?? '',
      companyName: m.job?.employer?.nearAccountId?.split('.')[0] ?? '',
      jobRequiredSkills: m.job?.requiredSkills ?? [],
      jobPreferredSkills: m.job?.preferredSkills ?? [],
      seekerSkills: [] as string[],
      seekerExperienceYears: '',
    }));
  }

  async matchForJob(jobId: string, limit = 5) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job || !job.embedding) {
      throw new NotFoundException('Job posting or embedding not found.');
    }

    // Step 1: ANN
    const annResults = await this.dataSource.query(
      `SELECT rp.id, rp.user_id, rp.skills, rp.summary, rp.parsed_data,
              rp.market_value_min, rp.market_value_max,
              1 - (rp.embedding::vector <=> $1::vector) as ann_score
       FROM resume_profile rp
       WHERE rp.embedding IS NOT NULL AND rp.status = 'COMPLETE'
       ORDER BY rp.embedding::vector <=> $1::vector
       LIMIT 20`,
      [job.embedding],
    );

    if (annResults.length === 0) return [];

    // Step 1.5: Hard filters — salary overlap + skill coverage
    const filtered = annResults.filter(
      (r: any) =>
        this.salaryOverlaps(job.salaryMin, job.salaryMax, r.market_value_min, r.market_value_max) &&
        this.skillCoverageOk(r.skills, job.requiredSkills),
    );
    if (filtered.length === 0) return [];

    // Step 2: Reranker
    const jobText = `${job.title} | ${job.description} | Skills: ${(job.requiredSkills ?? []).join(', ')}`;
    const resumeTexts = filtered.map(
      (r: any) => `${r.summary ?? ''} | Skills: ${(r.skills ?? []).join(', ')}`,
    );

    const rerankResults = await this.aiClient.rerank(jobText, resumeTexts, limit);

    // Step 3: Save MatchResults (skip rerank score < 0.5)
    const matches: MatchResult[] = [];
    let finalRank = 0;
    for (const rr of rerankResults) {
      if (rr.score < 0.5) continue;
      finalRank++;
      const resume = filtered[rr.index];

      const existing = await this.matchRepo.findOne({
        where: { seekerId: resume.user_id, jobId },
      });

      if (existing) {
        existing.annScore = resume.ann_score;
        existing.rerankScore = rr.score;
        existing.finalRank = finalRank;
        matches.push(await this.matchRepo.save(existing));
      } else {
        const match = this.matchRepo.create({
          seekerId: resume.user_id,
          jobId,
          annScore: resume.ann_score,
          rerankScore: rr.score,
          finalRank,
        });
        matches.push(await this.matchRepo.save(match));
      }
    }

    // Step 4: Auto-negotiate for all passing matches
    for (const match of matches) {
      if (!match.negotiationSessionId) {
        await this.autoNegotiate(match, job.employerId);
      }
    }

    return this.getCachedJobMatches(jobId);
  }

  async getCachedJobMatches(jobId: string) {
    const results = await this.matchRepo.find({
      where: { jobId },
      relations: ['job', 'job.employer'],
      order: { finalRank: 'ASC' },
    });

    // Batch-load seeker resumes
    const seekerIds = [...new Set(results.map((m) => m.seekerId))];
    const resumes = seekerIds.length > 0
      ? await this.resumeRepo.find({ where: { userId: In(seekerIds) } })
      : [];
    const resumeMap = new Map(resumes.map((r) => [r.userId, r]));

    return results.map((m) => {
      const resume = resumeMap.get(m.seekerId);
      return {
        id: m.id,
        seekerId: m.seekerId,
        jobId: m.jobId,
        annScore: m.annScore,
        rerankScore: m.rerankScore,
        finalRank: m.finalRank,
        seekerAgreed: m.seekerAgreed,
        employerAgreed: m.employerAgreed,
        negotiationSessionId: m.negotiationSessionId,
        jobTitle: m.job?.title ?? '',
        companyName: m.job?.employer?.nearAccountId?.split('.')[0] ?? '',
        jobRequiredSkills: m.job?.requiredSkills ?? [],
        jobPreferredSkills: m.job?.preferredSkills ?? [],
        seekerSkills: resume?.skills ?? [],
        seekerExperienceYears: resume?.experience?.length
          ? `${resume.experience.length} roles`
          : '',
      };
    });
  }

  /** Salary range overlap check — if either side is null, pass through */
  private salaryOverlaps(
    min1: number | null | undefined,
    max1: number | null | undefined,
    min2: number | null | undefined,
    max2: number | null | undefined,
  ): boolean {
    if (min1 == null || max1 == null || min2 == null || max2 == null) return true;
    return min1 <= max2 && min2 <= max1;
  }

  /** Required skill coverage check — case-insensitive, threshold default 50% */
  private skillCoverageOk(
    seekerSkills: string[] | null | undefined,
    requiredSkills: string[] | null | undefined,
    threshold = 0.5,
  ): boolean {
    if (!requiredSkills || requiredSkills.length === 0) return true;
    if (!seekerSkills || seekerSkills.length === 0) return false;
    const lower = new Set(seekerSkills.map((s) => s.toLowerCase()));
    const covered = requiredSkills.filter((s) => lower.has(s.toLowerCase())).length;
    return covered / requiredSkills.length >= threshold;
  }

  private async autoNegotiate(match: MatchResult, employerId: string): Promise<void> {
    try {
      match.seekerAgreed = true;
      match.employerAgreed = true;
      const result = await this.negotiationHandoff.createSession({
        jobId: match.jobId,
        seekerId: match.seekerId,
        employerId,
        matchId: match.id,
      });
      match.negotiationSessionId = result.sessionId;
      await this.matchRepo.save(match);
      this.logger.log(`Auto-negotiation started for match ${match.id} → session ${result.sessionId}`);
    } catch (err) {
      this.logger.error(`Auto-negotiation failed for match ${match.id}: ${err}`);
    }
  }

  async agree(matchId: string, userId: string, role: string): Promise<MatchResult> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Match result not found.');

    if (role === 'SEEKER' && match.seekerId !== userId) {
      throw new ForbiddenException('You can only agree to your own matches.');
    }

    if (role === 'EMPLOYER') {
      const job = await this.jobRepo.findOne({ where: { id: match.jobId } });
      if (!job || job.employerId !== userId) {
        throw new ForbiddenException('You can only agree to matches for your own job postings.');
      }
    }

    if (role === 'SEEKER') match.seekerAgreed = true;
    if (role === 'EMPLOYER') match.employerAgreed = true;

    const updated = await this.matchRepo.save(match);

    // Both agreed → create negotiation session
    if (updated.seekerAgreed && updated.employerAgreed && !updated.negotiationSessionId) {
      const job = await this.jobRepo.findOne({ where: { id: match.jobId } });
      const result = await this.negotiationHandoff.createSession({
        jobId: match.jobId,
        seekerId: match.seekerId,
        employerId: job!.employerId,
        matchId: match.id,
      });
      updated.negotiationSessionId = result.sessionId;
      await this.matchRepo.save(updated);
    }

    return updated;
  }

  async getMatchStatus(matchId: string): Promise<{
    id: string;
    seekerAgreed: boolean;
    employerAgreed: boolean;
    negotiationSessionId: string | null;
  }> {
    const match = await this.matchRepo.findOne({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Match result not found.');
    return {
      id: match.id,
      seekerAgreed: match.seekerAgreed,
      employerAgreed: match.employerAgreed,
      negotiationSessionId: match.negotiationSessionId,
    };
  }
}
