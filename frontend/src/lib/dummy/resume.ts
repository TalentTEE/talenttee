import { ResumeProfile } from '../types';

export const DUMMY_RESUME: ResumeProfile = {
  id: 'resume-1',
  userId: 'user-1',
  status: 'COMPLETED',
  skills: ['TypeScript', 'React', 'Next.js', 'NestJS', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
  experience: [
    {
      role: 'Full-stack Developer',
      company: 'Tech Corp',
      period: '2023.03 - present',
      highlights: ['Next.js SaaS platform development', 'NestJS API server design', 'PostgreSQL query optimization'],
    },
    {
      role: 'Frontend Developer',
      company: 'StartupX',
      period: '2021.06 - 2023.02',
      highlights: ['React + TypeScript migration lead', 'Design system creation', 'LCP 40% performance improvement'],
    },
  ],
  education: [
    { degree: 'B.S. Computer Science', institution: 'Seoul National University', year: '2021' },
  ],
  summary: 'TypeScript full-stack developer with 3 years of experience in React/Next.js frontend and NestJS backend. Active open-source contributor.',
  strengths: ['TypeScript full-stack capability', 'Open-source contributions (GitHub 500+)', 'SaaS service experience'],
  improvementAreas: ['Limited large-scale traffic experience', 'No mobile development experience'],
  marketValueMin: 60000000,
  marketValueMax: 75000000,
  marketValueReasoning: 'Based on 3 years of TypeScript full-stack experience, open-source activity, and SaaS background. Positioned above average salary of 65M for similar roles.',
  negotiationPoints: {
    strengths: ['High demand for TypeScript full-stack', 'Verified skills through open-source', 'SaaS operations experience'],
    weaknesses: ['Limited high-traffic operations experience', 'No leadership/management experience'],
  },
};
