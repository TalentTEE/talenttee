import { Injectable, Inject, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JobPosting } from '../entities/job-posting.entity.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/index.js';
import type { NearAiClient } from '../common/interfaces/index.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { JOB_CREATION_SYSTEM_PROMPT } from './prompts/job-creation.en.prompt.js';
import { BOUNDARY_SETTING_SYSTEM_PROMPT } from './prompts/boundary-setting.en.prompt.js';

interface ChatState {
  history: { role: string; content: string }[];
}

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);
  private chatSessions = new Map<string, ChatState>();

  constructor(
    @InjectRepository(JobPosting)
    private readonly jobRepo: Repository<JobPosting>,
    @Inject(NEAR_AI_CLIENT)
    private readonly aiClient: NearAiClient,
  ) {
    // Backfill embeddings for existing jobs on startup
    this.backfillEmbeddings().catch((err) =>
      this.logger.error(`Embedding backfill failed: ${err}`),
    );
  }

  private async backfillEmbeddings(): Promise<void> {
    const missing = await this.jobRepo.find({ where: { embedding: IsNull() } });
    if (missing.length === 0) return;
    this.logger.log(`Backfilling embeddings for ${missing.length} job(s)...`);
    for (const job of missing) {
      await this.generateEmbedding(job).catch((err) =>
        this.logger.error(`Backfill failed for job ${job.id}: ${err}`),
      );
    }
    this.logger.log('Embedding backfill complete.');
  }

  async listJobs(employerId?: string): Promise<JobPosting[]> {
    if (employerId) {
      return this.jobRepo.find({ where: { employerId }, order: { createdAt: 'DESC' } });
    }
    return this.jobRepo.find({ where: { status: 'ACTIVE' as any }, order: { createdAt: 'DESC' } });
  }

  async createJob(employerId: string, dto: CreateJobDto): Promise<JobPosting> {
    const job = this.jobRepo.create({ ...dto, employerId });
    const saved = await this.jobRepo.save(job);
    // Generate embedding asynchronously (don't block job creation)
    this.generateEmbedding(saved).catch((err) =>
      this.logger.error(`Embedding generation failed for job ${saved.id}: ${err}`),
    );
    return saved;
  }

  private async generateEmbedding(job: JobPosting): Promise<void> {
    const text = `${job.title} | ${job.description} | Skills: ${(job.requiredSkills ?? []).join(', ')}`;
    const embeddings = await this.aiClient.embed(text);
    if (embeddings.length > 0) {
      job.embedding = JSON.stringify(embeddings[0]);
      await this.jobRepo.save(job);
      this.logger.log(`Embedding generated for job ${job.id}`);
    }
  }

  async getJob(id: string): Promise<JobPosting> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job posting not found');
    return job;
  }

  async chatCreateJob(employerId: string, message: string, sessionId?: string): Promise<{ sessionId: string; response: any }> {
    const sid = sessionId || `job-chat-${employerId}-${Date.now()}`;
    let state = this.chatSessions.get(sid);
    if (!state) {
      state = { history: [] };
      this.chatSessions.set(sid, state);
    }

    state.history.push({ role: 'user', content: message });

    const result = await this.aiClient.chat({
      agentId: 'job-creation-agent',
      systemPrompt: JOB_CREATION_SYSTEM_PROMPT,
      userMessage: message,
      conversationHistory: state.history,
    });

    state.history.push({ role: 'assistant', content: result.content });

    let parsed: any;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      return { sessionId: sid, response: { complete: false, question: result.content } };
    }
    if (parsed.complete && parsed.jobPosting) {
      const job = await this.createJob(employerId, parsed.jobPosting);
      this.chatSessions.delete(sid);
      return { sessionId: sid, response: { complete: true, jobPosting: job } };
    }

    return { sessionId: sid, response: parsed };
  }

  async chatSetBoundary(jobId: string, employerId: string, message: string, sessionId?: string): Promise<{ sessionId: string; response: any }> {
    const job = await this.getJob(jobId);
    if (job.employerId !== employerId) throw new ForbiddenException('Not the job owner');

    const sid = sessionId || `boundary-chat-${jobId}-${Date.now()}`;
    let state = this.chatSessions.get(sid);
    if (!state) {
      state = { history: [] };
      this.chatSessions.set(sid, state);
    }

    state.history.push({ role: 'user', content: message });

    const result = await this.aiClient.chat({
      agentId: 'boundary-setting-agent',
      systemPrompt: BOUNDARY_SETTING_SYSTEM_PROMPT,
      userMessage: message,
      conversationHistory: state.history,
    });

    state.history.push({ role: 'assistant', content: result.content });

    let parsed: any;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      return { sessionId: sid, response: { complete: false, question: result.content } };
    }
    if (parsed.complete && parsed.boundary) {
      const boundary = {
        ...parsed.boundary,
        salaryMin: job.salaryMin || parsed.boundary.salaryMin,
        salaryMax: job.salaryMax || parsed.boundary.salaryMax,
      };
      job.negotiationBoundary = boundary;
      await this.jobRepo.save(job);
      this.chatSessions.delete(sid);
      return { sessionId: sid, response: { complete: true, boundary } };
    }

    return { sessionId: sid, response: parsed };
  }

  async getBoundary(jobId: string): Promise<Record<string, any> | null> {
    const job = await this.getJob(jobId);
    return job.negotiationBoundary;
  }
}
