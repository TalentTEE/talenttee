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
    const isEmployer = params.systemPrompt.includes('채용담당자');
    const roundMatch = params.userMessage.match(/라운드\s*(\d+)/i)
      || params.userMessage.match(/round\s*(\d+)/i);
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
          remotePolicy: '주3일 재택',
          workingHours: '유연근무',
          title: 'Senior Backend Engineer',
          startDate: '2026-07-01',
          probationMonths: 3,
        },
        reasoning: '구직자의 시장가치와 경험을 고려하여 최종 제안합니다.',
        decision: 'ACCEPT',
      };
    }

    return {
      round,
      actor: 'EMPLOYER_AGENT',
      proposal: {
        salary,
        remotePolicy: round >= 2 ? '주3일 재택' : '주2일 재택',
        workingHours: '유연근무',
        title: 'Senior Backend Engineer',
        startDate: '2026-07-01',
        probationMonths: 3,
      },
      reasoning: `예산 범위 내에서 ${round}차 제안입니다.`,
      decision: 'COUNTER',
    };
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
        remotePolicy: '주3일 재택',
        workingHours: '유연근무',
        title: 'Senior Backend Engineer',
        startDate: '2026-07-01',
        probationMonths: 3,
      },
      reasoning: `시장가치 분석 기반 ${round}차 카운터 제안입니다.`,
      decision: 'COUNTER',
    };
  }
}
