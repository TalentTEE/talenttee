import { MatchResultDisplay, MatchContext } from '../types';

export const DUMMY_SEEKER_MATCHES: MatchResultDisplay[] = [
  { id: 'match-1', seekerId: 'user-1', jobId: 'job-1', annScore: 0.92, rerankScore: 0.87, finalRank: 1, seekerAgreed: false, employerAgreed: false, seekerSkills: ['TypeScript', 'NestJS', 'PostgreSQL'], seekerExperienceYears: '3-5y', jobTitle: 'Senior Backend Developer', companyName: 'Company A', jobRequiredSkills: ['TypeScript', 'NestJS', 'PostgreSQL', 'Docker'], jobPreferredSkills: ['GraphQL', 'Redis'] },
  { id: 'match-2', seekerId: 'user-1', jobId: 'job-2', annScore: 0.88, rerankScore: 0.85, finalRank: 2, seekerAgreed: false, employerAgreed: false, seekerSkills: ['React', 'TypeScript', 'Node.js'], seekerExperienceYears: '3-5y', jobTitle: 'Full-stack Developer', companyName: 'Company B', jobRequiredSkills: ['React', 'TypeScript', 'Next.js', 'Node.js'], jobPreferredSkills: ['TailwindCSS'] },
  { id: 'match-3', seekerId: 'user-1', jobId: 'job-3', annScore: 0.75, rerankScore: 0.70, finalRank: 3, seekerAgreed: false, employerAgreed: false, seekerSkills: ['Docker', 'AWS'], seekerExperienceYears: '3-5y', jobTitle: 'DevOps Engineer', companyName: 'Company C', jobRequiredSkills: ['Docker', 'Kubernetes', 'AWS', 'Terraform'], jobPreferredSkills: ['Ansible'] },
];

export const DUMMY_EMPLOYER_MATCHES: MatchResultDisplay[] = [
  { id: 'match-1', seekerId: 'user-1', jobId: 'job-1', annScore: 0.92, rerankScore: 0.87, finalRank: 1, seekerAgreed: false, employerAgreed: false, seekerSkills: ['TypeScript', 'React', 'NestJS'], seekerExperienceYears: '3-5y', jobTitle: 'Senior Backend Developer', companyName: 'Company A', jobRequiredSkills: ['TypeScript', 'NestJS', 'PostgreSQL', 'Docker'], jobPreferredSkills: ['GraphQL'] },
  { id: 'match-4', seekerId: 'user-3', jobId: 'job-1', annScore: 0.85, rerankScore: 0.82, finalRank: 2, seekerAgreed: false, employerAgreed: false, seekerSkills: ['Go', 'Kubernetes', 'Docker'], seekerExperienceYears: '5-10y', jobTitle: 'Senior Backend Developer', companyName: 'Company A', jobRequiredSkills: ['TypeScript', 'NestJS', 'PostgreSQL', 'Docker'], jobPreferredSkills: ['GraphQL'] },
];

export const DUMMY_MATCH_CONTEXT: Record<string, MatchContext> = {
  'session-1': {
    annScore: 0.92,
    rerankScore: 0.87,
    seekerSkills: ['TypeScript', 'NestJS', 'PostgreSQL', 'React', 'Docker'],
    seekerSummary: 'Full-stack developer with 4 years of experience in TypeScript and backend systems. Strong expertise in NestJS, PostgreSQL, and cloud-native architectures.',
    jobRequiredSkills: ['TypeScript', 'NestJS', 'PostgreSQL', 'Docker'],
    jobPreferredSkills: ['GraphQL', 'Redis'],
    matchedRequired: ['TypeScript', 'NestJS', 'PostgreSQL', 'Docker'],
    matchedPreferred: [],
    missingRequired: [],
  },
  'session-2': {
    annScore: 0.75,
    rerankScore: 0.70,
    seekerSkills: ['React', 'TypeScript', 'Node.js', 'TailwindCSS'],
    seekerSummary: 'Frontend-focused developer with growing backend skills. Experienced in React ecosystems and modern CSS frameworks.',
    jobRequiredSkills: ['TypeScript', 'NestJS', 'PostgreSQL', 'Docker'],
    jobPreferredSkills: ['GraphQL', 'Redis'],
    matchedRequired: ['TypeScript'],
    matchedPreferred: [],
    missingRequired: ['NestJS', 'PostgreSQL', 'Docker'],
  },
};
