import { Injectable } from '@nestjs/common';
import { MatchResultQuery, SeekerProfile } from '../interfaces/match-result-query.interface.js';

@Injectable()
export class MockMatchResultQuery implements MatchResultQuery {
  async getSeekerProfile(seekerId: string): Promise<SeekerProfile> {
    return {
      resumeData: JSON.stringify({
        name: 'Demo Seeker',
        experience: [
          { company: 'TechCorp', role: 'Backend Developer', years: 3 },
          { company: 'StartupX', role: 'Senior Developer', years: 2 },
        ],
        skills: ['TypeScript', 'NestJS', 'PostgreSQL', 'NEAR Protocol', 'Docker'],
        education: [{ school: 'Seoul National University', degree: 'CS BSc', year: 2021 }],
      }),
      marketValueMin: 60_000_000,
      marketValueMax: 80_000_000,
      strengths: ['블록체인 경험', 'NestJS 전문성', '5년차 백엔드'],
      weaknesses: ['프론트엔드 경험 부족', '대규모 트래픽 경험 없음'],
      preferences: '원격근무 선호, 연봉 6,500만 이상 희망, 수습기간 3개월 이하',
    };
  }
}
