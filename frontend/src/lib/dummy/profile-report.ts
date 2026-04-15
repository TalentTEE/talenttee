import { ProfileReport } from '../types';

export const DUMMY_PROFILE_REPORT: ProfileReport = {
  seekerId: 'user-1',
  technicalSkills: [
    { skill: 'TypeScript', level: 'Expert', experience: '3y+' },
    { skill: 'React', level: 'Advanced', experience: '3y' },
    { skill: 'NestJS', level: 'Advanced', experience: '2y' },
    { skill: 'PostgreSQL', level: 'Intermediate', experience: '2y' },
    { skill: 'Docker', level: 'Intermediate', experience: '1y' },
  ],
  projects: [
    { name: 'SaaS Dashboard', role: 'Lead Frontend', impact: 'LCP 40% improvement, DAU 2x growth' },
    { name: 'API Gateway', role: 'Backend Developer', impact: 'Response time 200ms to 50ms' },
    { name: 'Design System', role: 'Creator & Maintainer', impact: 'Team-wide UI consistency' },
  ],
  collaboration: [
    { metric: 'Code review participation', value: '15/week avg' },
    { metric: 'PR merge rate', value: '94%' },
    { metric: 'Tech discussion participation', value: '5/week avg' },
  ],
  growthCurve: [
    { period: '2021', skills: ['JavaScript', 'React'] },
    { period: '2022', skills: ['TypeScript', 'Next.js', 'Testing'] },
    { period: '2023', skills: ['NestJS', 'PostgreSQL', 'Docker'] },
    { period: '2024-present', skills: ['AWS', 'CI/CD', 'Architecture'] },
  ],
  certifications: ['Engineer Information Processing', 'AWS Solutions Architect Associate'],
  marketValueRange: '$60M ~ $75M',
};
