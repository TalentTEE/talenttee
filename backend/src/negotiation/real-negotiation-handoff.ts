import { Injectable } from '@nestjs/common';
import { NegotiationHandoff } from '../common/interfaces/negotiation-handoff.interface.js';
import { NegotiationService } from './negotiation.service.js';

@Injectable()
export class RealNegotiationHandoff implements NegotiationHandoff {
  constructor(private readonly negotiationService: NegotiationService) {}

  async createSession(params: {
    jobId: string;
    seekerId: string;
    employerId: string;
    matchId: string;
  }): Promise<{ sessionId: string }> {
    const session = await this.negotiationService.createSession(params.jobId, params.seekerId);
    await this.negotiationService.startNegotiation(session.id);
    return { sessionId: session.id };
  }
}
