import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { DatasourceService } from '../datasource/datasource.service.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/near-ai-client.interface.js';
import type { NearAiClient } from '../common/interfaces/near-ai-client.interface.js';
import { ResumeStatus } from '../common/enums/index.js';
import { MATCH_EVENTS } from '../common/events/match.events.js';
import { DATA_CLASSIFY_PROMPT } from './prompts/data-classify.en.prompt.js';
import { RESUME_GENERATE_PROMPT } from './prompts/resume-generate.en.prompt.js';
import { MARKET_VALUE_PROMPT } from './prompts/market-value.en.prompt.js';

@Injectable()
export class ResumeService {
  constructor(
    @InjectRepository(ResumeProfile)
    private readonly resumeRepo: Repository<ResumeProfile>,
    private readonly datasourceService: DatasourceService,
    @Inject(NEAR_AI_CLIENT)
    private readonly aiClient: NearAiClient,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /* ---------------------------------------------------------- *
   * Public API
   * ---------------------------------------------------------- */

  async generate(userId: string): Promise<ResumeProfile> {
    let resume = await this.resumeRepo.findOne({ where: { userId } });

    if (!resume) {
      resume = this.resumeRepo.create({
        userId,
        status: ResumeStatus.COLLECTING,
      });
      resume = await this.resumeRepo.save(resume);
    } else {
      resume.status = ResumeStatus.COLLECTING;
      resume = await this.resumeRepo.save(resume);
    }

    // fire-and-forget
    this.runPipeline(resume.id, userId).catch((err) => {
      console.error(`Resume pipeline failed for ${userId}:`, err);
    });

    return resume;
  }

  async getResume(id: string): Promise<ResumeProfile> {
    const resume = await this.resumeRepo.findOne({ where: { id } });
    if (!resume) throw new NotFoundException(`Resume ${id} not found`);
    return resume;
  }

  async getResumeByUserId(userId: string): Promise<ResumeProfile | null> {
    return this.resumeRepo.findOne({ where: { userId } });
  }

  async getStatusByUserId(userId: string): Promise<{ id: string; status: ResumeStatus } | null> {
    const resume = await this.resumeRepo.findOne({ where: { userId } });
    if (!resume) return null;
    return { id: resume.id, status: resume.status };
  }

  async getMarketValueByUserId(userId: string): Promise<{
    marketValueMin: number;
    marketValueMax: number;
    reasoning: string;
    negotiationPoints: Record<string, any>;
  } | null> {
    const resume = await this.resumeRepo.findOne({ where: { userId } });
    if (!resume) return null;
    return {
      marketValueMin: resume.marketValueMin,
      marketValueMax: resume.marketValueMax,
      reasoning: resume.marketValueReasoning,
      negotiationPoints: resume.negotiationPoints,
    };
  }

  async getStatus(id: string): Promise<{ id: string; status: ResumeStatus }> {
    const resume = await this.getResume(id);
    return { id: resume.id, status: resume.status };
  }

  async getMarketValue(id: string): Promise<{
    marketValueMin: number;
    marketValueMax: number;
    reasoning: string;
    negotiationPoints: Record<string, any>;
  }> {
    const resume = await this.getResume(id);
    return {
      marketValueMin: resume.marketValueMin,
      marketValueMax: resume.marketValueMax,
      reasoning: resume.marketValueReasoning,
      negotiationPoints: resume.negotiationPoints,
    };
  }

  buildResumeText(resume: ResumeProfile): string {
    const parts: string[] = [];

    if (resume.summary) {
      parts.push(`Summary: ${resume.summary}`);
    }

    if (resume.skills?.length) {
      parts.push(`Tech Stack: ${resume.skills.join(', ')}`);
    }

    if (resume.softSkills?.length) {
      parts.push(`Soft Skills: ${resume.softSkills.join(', ')}`);
    }

    if (resume.experience?.length) {
      const expLines = resume.experience.map(
        (e) =>
          `${e.role} @ ${e.company} (${e.period}) - ${(e.highlights ?? []).join('; ')}`,
      );
      parts.push(`Experience:\n${expLines.join('\n')}`);
    }

    if (resume.education?.length) {
      const eduLines = resume.education.map(
        (e) => `${e.degree} - ${e.institution} (${e.year})`,
      );
      parts.push(`Education:\n${eduLines.join('\n')}`);
    }

    return parts.join('\n\n');
  }

  /* ---------------------------------------------------------- *
   * Pipeline (async, fire-and-forget)
   * ---------------------------------------------------------- */

  private async runPipeline(resumeId: string, userId: string): Promise<void> {
    try {
      // 1. Collect data
      const data = await this.datasourceService.collectAllData(userId);

      // 2. Update status -> ANALYZING
      await this.resumeRepo.update(resumeId, {
        status: ResumeStatus.ANALYZING,
      });

      // 3. Classify Slack messages (if available)
      let classifiedData: any[] = [];
      if (data.slack?.messages?.length) {
        const classifyResult = await this.aiClient.chat({
          agentId: 'resume-classifier',
          systemPrompt: DATA_CLASSIFY_PROMPT,
          userMessage: JSON.stringify(data.slack.messages),
        });
        classifiedData = this.safeJsonParse(classifyResult.content) ?? [];
      }

      // 4. Generate structured resume
      const allData = {
        github: data.github,
        slack: { ...data.slack, classified: classifiedData },
        discord: data.discord,
        gov24: data.gov24,
      };

      const resumeResult = await this.aiClient.chat({
        agentId: 'resume-generator',
        systemPrompt: RESUME_GENERATE_PROMPT,
        userMessage: JSON.stringify(allData),
      });

      const parsed = this.safeJsonParse(resumeResult.content);

      // 5. Update resume fields
      const updatePayload: Partial<ResumeProfile> = {
        rawText: JSON.stringify(allData),
        parsedData: parsed,
      };

      if (parsed) {
        updatePayload.skills = parsed.skills ?? [];
        updatePayload.softSkills = parsed.softSkills ?? [];
        updatePayload.experience = parsed.experience ?? [];
        updatePayload.education = parsed.education ?? [];
        updatePayload.summary = parsed.summary ?? null;
        updatePayload.negotiationPoints = {
          strengths: parsed.strengths ?? [],
          improvement_areas: parsed.improvement_areas ?? [],
        };
      }

      await this.resumeRepo.update(resumeId, updatePayload);

      // 6. Generate embedding
      const resumeForEmbed = await this.resumeRepo.findOne({
        where: { id: resumeId },
      });
      if (resumeForEmbed) {
        const textForEmbed = this.buildResumeText(resumeForEmbed);
        const embeddings = await this.aiClient.embed(textForEmbed);
        if (embeddings.length > 0) {
          await this.resumeRepo.update(resumeId, {
            embedding: JSON.stringify(embeddings[0]),
          });
        }
      }

      // 7. Calculate market value
      const resumeText = resumeForEmbed
        ? this.buildResumeText(resumeForEmbed)
        : '';
      const marketResult = await this.aiClient.chat({
        agentId: 'market-value-analyst',
        systemPrompt: MARKET_VALUE_PROMPT,
        userMessage: resumeText,
      });

      const marketParsed = this.safeJsonParse(marketResult.content);
      if (marketParsed) {
        await this.resumeRepo.update(resumeId, {
          marketValueMin: marketParsed.marketValueMin,
          marketValueMax: marketParsed.marketValueMax,
          marketValueReasoning: marketParsed.reasoning,
          negotiationPoints: marketParsed.negotiationPoints,
        });
      }

      // 8. Mark complete
      await this.resumeRepo.update(resumeId, {
        status: ResumeStatus.COMPLETE,
      });

      // 9. Emit event for auto-matching
      this.eventEmitter.emit(MATCH_EVENTS.RESUME_COMPLETED, { seekerId: userId });
    } catch (err) {
      await this.resumeRepo.update(resumeId, {
        status: ResumeStatus.ERROR,
      });
      throw err;
    }
  }

  /* ---------------------------------------------------------- *
   * Helpers
   * ---------------------------------------------------------- */

  private safeJsonParse(content: string): any | null {
    try {
      // Strip markdown code fences if present
      const stripped = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      return JSON.parse(stripped);
    } catch {
      return null;
    }
  }
}
