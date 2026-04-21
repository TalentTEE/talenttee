import { Inject, Injectable } from '@nestjs/common';
import { NEAR_AI_CLIENT } from '../common/interfaces/near-ai-client.interface.js';
import type { NearAiClient } from '../common/interfaces/near-ai-client.interface.js';
import { PDF_RESUME_ANALYSIS_PROMPT } from './prompts/pdf-resume-analysis.prompt.js';

export interface PdfParseResult {
  rawText: string;
  structured: {
    skills: string[];
    softSkills: string[];
    experience: { role: string; company: string; period: string; highlights: string[] }[];
    education: { degree: string; institution: string; year: string }[];
    certifications: string[];
    summary: string;
    strengths: string[];
    improvement_areas: string[];
  } | null;
}

@Injectable()
export class PdfParserService {
  constructor(
    @Inject(NEAR_AI_CLIENT)
    private readonly aiClient: NearAiClient,
  ) {}

  async parseBuffer(buffer: Buffer): Promise<PdfParseResult> {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const textResult = await parser.getText();
    const rawText = textResult.text?.trim() ?? '';

    if (!rawText) {
      return { rawText: '', structured: null };
    }

    // Truncate very long resumes to avoid token limits
    const truncated = rawText.length > 15000 ? rawText.slice(0, 15000) + '\n...[truncated]' : rawText;

    const result = await this.aiClient.chat({
      agentId: 'pdf-resume-parser',
      systemPrompt: PDF_RESUME_ANALYSIS_PROMPT,
      userMessage: truncated,
    });

    const structured = this.safeJsonParse(result.content);
    return { rawText, structured };
  }

  private safeJsonParse(content: string): any | null {
    try {
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
