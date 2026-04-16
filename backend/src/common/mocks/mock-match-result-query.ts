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
      strengths: ['Blockchain experience', 'NestJS expertise', '5 years backend'],
      weaknesses: ['Limited frontend experience', 'No large-scale traffic experience'],
      softSkills: ['Team collaboration', 'Technical mentoring', 'Clear communication', 'Initiative'],
      preferences: 'Prefers remote work, salary 65M+ KRW, probation 3 months or less',
    };
  }
}
