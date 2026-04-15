import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MatchResult } from '../entities/match-result.entity.js';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { JobPosting } from '../entities/job-posting.entity.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/near-ai-client.interface.js';
import type { NearAiClient } from '../common/interfaces/near-ai-client.interface.js';
import { NEGOTIATION_HANDOFF } from '../common/interfaces/negotiation-handoff.interface.js';
import type { NegotiationHandoff } from '../common/interfaces/negotiation-handoff.interface.js';
import { ResumeService } from '../resume/resume.service.js';

@Injectable()
export class MatchService {
  constructor(
    @InjectRepository(MatchResult)
    private readonly matchRepo: Repository<MatchResult>,
    @InjectRepository(JobPosting)
    private readonly jobRepo: Repository<JobPosting>,
    @InjectRepository(ResumeProfile)
    private readonly resumeRepo: Repository<ResumeProfile>,
    @Inject(NEAR_AI_CLIENT)
    private readonly aiClient: NearAiClient,
    @Inject(NEGOTIATION_HANDOFF)
    private readonly negotiationHandoff: NegotiationHandoff,
    private readonly resumeService: ResumeService,
    private readonly dataSource: DataSource,
  ) {}

  async matchForSeeker(seekerId: string, limit = 5): Promise<MatchResult[]> {
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

    // Step 2: Reranker
    const resumeText = this.resumeService.buildResumeText(resume);
    const jobTexts = annResults.map(
      (j: any) => `${j.title} | ${j.description} | Skills: ${(j.required_skills ?? []).join(', ')}`,
    );

    const rerankResults = await this.aiClient.rerank(resumeText, jobTexts, limit);

    // Step 3: Save MatchResults
    const matches: MatchResult[] = [];
    for (let rank = 0; rank < rerankResults.length; rank++) {
      const rr = rerankResults[rank];
      const job = annResults[rr.index];

      const existing = await this.matchRepo.findOne({
        where: { seekerId, jobId: job.id },
      });

      if (existing) {
        existing.annScore = job.ann_score;
        existing.rerankScore = rr.score;
        existing.finalRank = rank + 1;
        matches.push(await this.matchRepo.save(existing));
      } else {
        const match = this.matchRepo.create({
          seekerId,
          jobId: job.id,
          annScore: job.ann_score,
          rerankScore: rr.score,
          finalRank: rank + 1,
        });
        matches.push(await this.matchRepo.save(match));
      }
    }

    return matches;
  }

  async matchForJob(jobId: string, limit = 5): Promise<MatchResult[]> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job || !job.embedding) {
      throw new NotFoundException('Job posting or embedding not found.');
    }

    // Step 1: ANN
    const annResults = await this.dataSource.query(
      `SELECT rp.id, rp.user_id, rp.skills, rp.summary, rp.parsed_data,
              1 - (rp.embedding::vector <=> $1::vector) as ann_score
       FROM resume_profile rp
       WHERE rp.embedding IS NOT NULL AND rp.status = 'COMPLETE'
       ORDER BY rp.embedding::vector <=> $1::vector
       LIMIT 20`,
      [job.embedding],
    );

    if (annResults.length === 0) return [];

    // Step 2: Reranker
    const jobText = `${job.title} | ${job.description} | Skills: ${(job.requiredSkills ?? []).join(', ')}`;
    const resumeTexts = annResults.map(
      (r: any) => `${r.summary ?? ''} | Skills: ${(r.skills ?? []).join(', ')}`,
    );

    const rerankResults = await this.aiClient.rerank(jobText, resumeTexts, limit);

    // Step 3: Save MatchResults
    const matches: MatchResult[] = [];
    for (let rank = 0; rank < rerankResults.length; rank++) {
      const rr = rerankResults[rank];
      const resume = annResults[rr.index];

      const existing = await this.matchRepo.findOne({
        where: { seekerId: resume.user_id, jobId },
      });

      if (existing) {
        existing.annScore = resume.ann_score;
        existing.rerankScore = rr.score;
        existing.finalRank = rank + 1;
        matches.push(await this.matchRepo.save(existing));
      } else {
        const match = this.matchRepo.create({
          seekerId: resume.user_id,
          jobId,
          annScore: resume.ann_score,
          rerankScore: rr.score,
          finalRank: rank + 1,
        });
        matches.push(await this.matchRepo.save(match));
      }
    }

    return matches;
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
