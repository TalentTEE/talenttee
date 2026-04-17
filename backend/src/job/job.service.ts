import { Injectable, Inject, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobPosting } from '../entities/job-posting.entity.js';
import { JobPostingStatus } from '../common/enums/index.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/index.js';
import type { NearAiClient } from '../common/interfaces/index.js';
import { MATCH_EVENTS } from '../common/events/match.events.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { JOB_CREATION_SYSTEM_PROMPT } from './prompts/job-creation.en.prompt.js';
import { BOUNDARY_SETTING_SYSTEM_PROMPT } from './prompts/boundary-setting.en.prompt.js';
import { SALARY_RECOMMEND_PROMPT } from './prompts/salary-recommend.en.prompt.js';

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
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Backfill embeddings for existing jobs on startup
    this.backfillEmbeddings().catch((err) =>
      this.logger.error(`Embedding backfill failed: ${err}`),
    );
  }

  private async backfillEmbeddings(): Promise<void> {
    // Only backfill embeddings for ACTIVE jobs (drafts don't need embeddings yet)
    const missing = await this.jobRepo.find({
      where: { embedding: IsNull(), status: JobPostingStatus.ACTIVE },
    });
    if (missing.length === 0) return;
    this.logger.log(`Backfilling embeddings for ${missing.length} active job(s)...`);
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
    return this.jobRepo.find({
      where: { status: JobPostingStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async createJob(employerId: string, dto: CreateJobDto): Promise<JobPosting> {
    // New jobs start as DRAFT — no embedding, not matched until published.
    const job = this.jobRepo.create({ ...dto, employerId, status: JobPostingStatus.DRAFT });
    return this.jobRepo.save(job);
  }

  async publishJob(jobId: string, employerId: string): Promise<JobPosting> {
    const job = await this.getJob(jobId);
    if (job.employerId !== employerId) {
      throw new ForbiddenException('Not the job owner');
    }
    if (job.status === JobPostingStatus.ACTIVE) {
      return job; // idempotent — already published
    }
    if (job.status === JobPostingStatus.CLOSED) {
      throw new BadRequestException('Cannot publish a closed job posting');
    }

    job.status = JobPostingStatus.ACTIVE;
    const saved = await this.jobRepo.save(job);

    // Generate embedding asynchronously (don't block publish response).
    // generateEmbedding() emits MATCH_EVENTS.JOB_CREATED so matching picks it up.
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
      this.eventEmitter.emit(MATCH_EVENTS.JOB_CREATED, { jobId: job.id });
    }
  }

  async closeJob(jobId: string, employerId: string): Promise<JobPosting> {
    const job = await this.getJob(jobId);
    if (job.employerId !== employerId) {
      throw new ForbiddenException('Not the job owner');
    }
    if (job.status === JobPostingStatus.CLOSED) {
      return job; // idempotent
    }
    job.status = JobPostingStatus.CLOSED;
    return this.jobRepo.save(job);
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
      return { sessionId: sid, response: { complete: true, jobPosting: job, salaryRecommendation: parsed.salaryRecommendation } };
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

  async recommendSalary(dto: { title: string; description: string; skills: string[] }): Promise<{ salaryMin: number; salaryMax: number; reasoning: string }> {
    const userMessage = `Job Title: ${dto.title}\nDescription: ${dto.description}\nRequired Skills: ${dto.skills.join(', ')}`;

    const result = await this.aiClient.chat({
      agentId: 'salary-recommend',
      systemPrompt: SALARY_RECOMMEND_PROMPT,
      userMessage,
    });

    try {
      const parsed = JSON.parse(result.content);
      return {
        salaryMin: parsed.salaryMin ?? 0,
        salaryMax: parsed.salaryMax ?? 0,
        reasoning: parsed.reasoning ?? '',
      };
    } catch {
      this.logger.warn(`Failed to parse salary recommendation: ${result.content}`);
      return { salaryMin: 0, salaryMax: 0, reasoning: 'Unable to estimate salary for this role.' };
    }
  }
}
