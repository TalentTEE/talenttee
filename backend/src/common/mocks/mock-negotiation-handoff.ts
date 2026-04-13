import { Injectable } from '@nestjs/common';
import { NegotiationHandoff } from '../interfaces/negotiation-handoff.interface.js';
import { randomUUID } from 'crypto';

@Injectable()
export class MockNegotiationHandoff implements NegotiationHandoff {
  async createSession(_params: {
    jobId: string;
    seekerId: string;
    employerId: string;
    matchId: string;
  }): Promise<{ sessionId: string }> {
    return { sessionId: randomUUID() };
  }
}
