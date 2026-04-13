import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileAccessGrant } from '../entities/profile-access-grant.entity.js';
import { ResumeProfile } from '../entities/resume-profile.entity.js';
import { NEAR_AI_CLIENT } from '../common/interfaces/near-ai-client.interface.js';
import type { NearAiClient } from '../common/interfaces/near-ai-client.interface.js';
import { ESCROW_PAYMENT } from '../common/interfaces/escrow-payment.interface.js';
import type { EscrowPayment } from '../common/interfaces/escrow-payment.interface.js';
import { DETAIL_REPORT_PROMPT } from './prompts/detail-report.prompt.js';

const PROFILE_ACCESS_COST = '1000000000000000000000000'; // 1 NEAR

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(ProfileAccessGrant)
    private readonly grantRepo: Repository<ProfileAccessGrant>,
    @InjectRepository(ResumeProfile)
    private readonly resumeRepo: Repository<ResumeProfile>,
    @Inject(NEAR_AI_CLIENT)
    private readonly aiClient: NearAiClient,
    @Inject(ESCROW_PAYMENT)
    private readonly escrowPayment: EscrowPayment,
  ) {}

  async requestAccess(employerId: string, seekerId: string, employerAccountId: string): Promise<ProfileAccessGrant> {
    const existing = await this.grantRepo.findOne({ where: { employerId, seekerId } });
    if (existing) return existing;

    const balance = await this.escrowPayment.checkBalance(employerAccountId);
    if (BigInt(balance) < BigInt(PROFILE_ACCESS_COST)) {
      throw new ForbiddenException('에스크로 잔액이 부족합니다. 먼저 입금해주세요.');
    }

    const { txHash } = await this.escrowPayment.payForProfile(employerAccountId, PROFILE_ACCESS_COST);

    const grant = this.grantRepo.create({
      employerId,
      seekerId,
      amount: Number(PROFILE_ACCESS_COST),
      nearTxHash: txHash,
    });

    return this.grantRepo.save(grant);
  }

  async getReport(employerId: string, seekerId: string): Promise<Record<string, any>> {
    const grant = await this.grantRepo.findOne({ where: { employerId, seekerId } });
    if (!grant) {
      throw new ForbiddenException('열람 권한이 없습니다. 먼저 프로필 열람을 요청하세요.');
    }

    const resume = await this.resumeRepo.findOne({ where: { userId: seekerId } });
    if (!resume) throw new NotFoundException('구직자의 이력서를 찾을 수 없습니다.');

    const result = await this.aiClient.chat({
      agentId: 'profile-reporter',
      systemPrompt: DETAIL_REPORT_PROMPT,
      userMessage: JSON.stringify({
        parsedData: resume.parsedData,
        skills: resume.skills,
        experience: resume.experience,
        education: resume.education,
        summary: resume.summary,
        marketValueMin: resume.marketValueMin,
        marketValueMax: resume.marketValueMax,
      }),
    });

    try {
      const cleaned = result.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return { rawReport: result.content };
    }
  }

  async getAccessHistory(employerId: string): Promise<ProfileAccessGrant[]> {
    return this.grantRepo.find({ where: { employerId }, order: { createdAt: 'DESC' } });
  }

  async hasAccess(employerId: string, seekerId: string): Promise<boolean> {
    const grant = await this.grantRepo.findOne({ where: { employerId, seekerId } });
    return !!grant;
  }
}
