import { Injectable } from '@nestjs/common';
import { NearAiClient } from '../interfaces/near-ai-client.interface.js';

@Injectable()
export class MockNearAiClient implements NearAiClient {
  async chat(params: {
    agentId: string;
    systemPrompt: string;
    userMessage: string;
    conversationHistory?: { role: string; content: string }[];
  }): Promise<{ content: string }> {
    const isEmployer = params.systemPrompt.includes('employer');
    const roundMatch = params.userMessage.match(/round\s*(\d+)/i);
    const round = roundMatch ? parseInt(roundMatch[1], 10) : 1;

    if (isEmployer) {
      return { content: JSON.stringify(this.employerResponse(round)) };
    }
    return { content: JSON.stringify(this.seekerResponse(round)) };
  }

  private employerResponse(round: number) {
    const baseSalary = 55_000_000;
    const increment = 5_000_000 * round;
    const salary = Math.min(baseSalary + increment, 70_000_000);

    if (round >= 3) {
      return {
        round,
        actor: 'EMPLOYER_AGENT',
        proposal: {
          salary: 68_000_000,
          remotePolicy: 'Remote 3 days/week',
          workingHours: 'Flexible hours',
          title: 'Senior Backend Engineer',
          startDate: '2026-07-01',
          probationMonths: 3,
        },
        reasoning: 'Final offer considering the candidate market value and experience.',
        decision: 'ACCEPT',
      };
    }

    return {
      round,
      actor: 'EMPLOYER_AGENT',
      proposal: {
        salary,
        remotePolicy: round >= 2 ? 'Remote 3 days/week' : 'Remote 2 days/week',
        workingHours: 'Flexible hours',
        title: 'Senior Backend Engineer',
        startDate: '2026-07-01',
        probationMonths: 3,
      },
      reasoning: `Proposal #${round} within budget range.`,
      decision: 'COUNTER',
    };
  }

  async embed(input: string | string[]): Promise<number[][]> {
    const inputs = Array.isArray(input) ? input : [input];
    return inputs.map(() => Array.from({ length: 1024 }, () => Math.random() * 2 - 1));
  }

  async rerank(query: string, documents: string[], topN?: number): Promise<{ index: number; score: number }[]> {
    const limit = topN ?? documents.length;
    return documents
      .map((_, index) => ({ index, score: Math.random() }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private seekerResponse(round: number) {
    const baseSalary = 75_000_000;
    const decrement = 3_000_000 * round;
    const salary = Math.max(baseSalary - decrement, 68_000_000);

    return {
      round,
      actor: 'SEEKER_AGENT',
      proposal: {
        salary,
        remotePolicy: 'Remote 3 days/week',
        workingHours: 'Flexible hours',
        title: 'Senior Backend Engineer',
        startDate: '2026-07-01',
        probationMonths: 3,
      },
      reasoning: `Counter-proposal #${round} based on market value analysis.`,
      decision: 'COUNTER',
    };
  }
}
