import { MatchResultDisplay } from '../types';

export const DUMMY_SEEKER_MATCHES: MatchResultDisplay[] = [
  { id: 'match-1', seekerId: 'user-1', jobId: 'job-1', annScore: 0.92, rerankScore: 0.87, finalRank: 1, seekerAgreed: false, employerAgreed: false, seekerSkills: ['TypeScript', 'NestJS', 'PostgreSQL'], seekerExperienceYears: '3-5y', jobTitle: 'Senior Backend Developer', companyName: 'Company A' },
  { id: 'match-2', seekerId: 'user-1', jobId: 'job-2', annScore: 0.88, rerankScore: 0.85, finalRank: 2, seekerAgreed: false, employerAgreed: false, seekerSkills: ['React', 'TypeScript', 'Node.js'], seekerExperienceYears: '3-5y', jobTitle: 'Full-stack Developer', companyName: 'Company B' },
  { id: 'match-3', seekerId: 'user-1', jobId: 'job-3', annScore: 0.75, rerankScore: 0.70, finalRank: 3, seekerAgreed: false, employerAgreed: false, seekerSkills: ['Docker', 'AWS'], seekerExperienceYears: '3-5y', jobTitle: 'DevOps Engineer', companyName: 'Company C' },
];

export const DUMMY_EMPLOYER_MATCHES: MatchResultDisplay[] = [
  { id: 'match-1', seekerId: 'user-1', jobId: 'job-1', annScore: 0.92, rerankScore: 0.87, finalRank: 1, seekerAgreed: false, employerAgreed: false, seekerSkills: ['TypeScript', 'React', 'NestJS'], seekerExperienceYears: '3-5y', jobTitle: 'Senior Backend Developer', companyName: 'Company A' },
  { id: 'match-4', seekerId: 'user-3', jobId: 'job-1', annScore: 0.85, rerankScore: 0.82, finalRank: 2, seekerAgreed: false, employerAgreed: false, seekerSkills: ['Go', 'Kubernetes', 'Docker'], seekerExperienceYears: '5-10y', jobTitle: 'Senior Backend Developer', companyName: 'Company A' },
];
