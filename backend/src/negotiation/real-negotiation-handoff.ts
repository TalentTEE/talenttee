import { Injectable, Logger } from '@nestjs/common';
import { NegotiationHandoff } from '../common/interfaces/negotiation-handoff.interface.js';
import { NegotiationService } from './negotiation.service.js';
import { ProfileService } from '../profile/profile.service.js';

@Injectable()
export class RealNegotiationHandoff implements NegotiationHandoff {
  private readonly logger = new Logger(RealNegotiationHandoff.name);

  constructor(
    private readonly negotiationService: NegotiationService,
    private readonly profileService: ProfileService,
  ) {}

  async createSession(params: {
    jobId: string;
    seekerId: string;
    employerId: string;
    matchId: string;
    employerAccountId: string;
  }): Promise<{ sessionId: string }> {
    // 협상 시작 전 자동 결제 (이력서 열람권)
    await this.profileService.requestAccess(params.employerId, params.seekerId, params.employerAccountId);
    this.logger.log(`Profile access granted: employer=${params.employerId} → seeker=${params.seekerId}`);

    const session = await this.negotiationService.createSession(params.jobId, params.seekerId);
    await this.negotiationService.startNegotiation(session.id);
    return { sessionId: session.id };
  }
}
