import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { NegotiationHandoff } from '../common/interfaces/negotiation-handoff.interface.js';
import { NegotiationService } from './negotiation.service.js';
import { ProfileService } from '../profile/profile.service.js';
import { User } from '../entities/user.entity.js';
import { NegotiationSession } from '../entities/negotiation-session.entity.js';
import { NegotiationState } from '../common/enums/index.js';

@Injectable()
export class RealNegotiationHandoff implements NegotiationHandoff {
  private readonly logger = new Logger(RealNegotiationHandoff.name);

  constructor(
    private readonly negotiationService: NegotiationService,
    private readonly profileService: ProfileService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(NegotiationSession)
    private readonly sessionRepo: Repository<NegotiationSession>,
  ) {}

  async createSession(params: {
    jobId: string;
    seekerId: string;
    employerId: string;
    matchId: string;
    employerAccountId: string;
  }): Promise<{ sessionId: string }> {
    // Check auto-negotiate limit for seeker
    const seeker = await this.userRepo.findOne({ where: { id: params.seekerId } });
    if (seeker) {
      const limit = seeker.autoNegLimit ?? 5;
      const activeCount = await this.sessionRepo.count({
        where: {
          seekerId: params.seekerId,
          state: Not(In([NegotiationState.FAILED])),
        },
      });
      if (activeCount >= limit) {
        this.logger.warn(`Seeker ${params.seekerId} hit auto-negotiate limit (${activeCount}/${limit}), skipping`);
        return { sessionId: '' };
      }
    }

    // 협상 시작 전 자동 결제 (이력서 열람권)
    await this.profileService.requestAccess(params.employerId, params.seekerId, params.employerAccountId);
    this.logger.log(`Profile access granted: employer=${params.employerId} → seeker=${params.seekerId}`);

    const session = await this.negotiationService.createSession(params.jobId, params.seekerId);
    await this.negotiationService.startNegotiation(session.id);
    return { sessionId: session.id };
  }
}
