import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPosting } from '../entities/job-posting.entity.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/index.js';
import type { NearAiClient } from '../common/interfaces/index.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { JOB_CREATION_SYSTEM_PROMPT } from './prompts/job-creation.prompt.js';
import { BOUNDARY_SETTING_SYSTEM_PROMPT } from './prompts/boundary-setting.prompt.js';

interface ChatState {
  history: { role: string; content: string }[];
}

@Injectable()
export class JobService {
  private chatSessions = new Map<string, ChatState>();

  constructor(
    @InjectRepository(JobPosting)
    private readonly jobRepo: Repository<JobPosting>,
    @Inject(NEAR_AI_CLIENT)
    private readonly aiClient: NearAiClient,
  ) {}

  async listJobs(employerId?: string): Promise<JobPosting[]> {
    if (employerId) {
      return this.jobRepo.find({ where: { employerId }, order: { createdAt: 'DESC' } });
    }
    return this.jobRepo.find({ where: { status: 'ACTIVE' as any }, order: { createdAt: 'DESC' } });
  }

  async createJob(employerId: string, dto: CreateJobDto): Promise<JobPosting> {
    const job = this.jobRepo.create({ ...dto, employerId });
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
