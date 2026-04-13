export type UserRole = 'SEEKER' | 'EMPLOYER';

export interface User {
  id: string;
  nearAccountId: string;
  role: UserRole;
  publicKey: string;
  createdAt: string;
}

export interface DataSourceConnection {
  id: string;
  userId: string;
  provider: 'GITHUB' | 'SLACK' | 'DISCORD' | 'GOV24';
  status: 'CONNECTED' | 'MOCK' | 'DISCONNECTED';
  lastSyncedAt: string | null;
}

export interface ResumeProfile {
  id: string;
  userId: string;
  status: 'COLLECTING' | 'ANALYZING' | 'COMPLETE' | 'ERROR';
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  summary: string;
  strengths: string[];
  improvementAreas: string[];
  marketValueMin: number | null;
  marketValueMax: number | null;
  marketValueReasoning: string | null;
  negotiationPoints: {
    strengths: string[];
    weaknesses: string[];
  } | null;
}

export interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  highlights: string[];
}

export interface EducationItem {
  degree: string;
  institution: string;
  year: string;
}

export interface JobPosting {
  id: string;
  employerId: string;
  title: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  salaryMin: number;
  salaryMax: number;
  remotePolicy: string;
  workingHours: string;
  benefits: string;
  status: 'ACTIVE' | 'CLOSED';
  negotiationBoundary: NegotiationBoundary | null;
}

export interface NegotiationBoundary {
  salaryMin: number;
  salaryMax: number;
  salaryHardMax: number;
  remotePolicyOptions: string[];
  nonNegotiableItems: string[];
  flexibleItems: string[];
  negotiationStyle: 'conservative' | 'moderate' | 'aggressive';
}

export interface MatchResult {
  id: string;
  seekerId: string;
  jobId: string;
  annScore: number;
  rerankScore: number;
  finalRank: number;
  seekerAgreed: boolean;
  employerAgreed: boolean;
}

/** Extended match result with joined display fields (not in backend entity) */
export interface MatchResultDisplay extends MatchResult {
  seekerSkills: string[];
  seekerExperienceYears: string;
  jobTitle: string;
  companyName: string;
}

export interface ProfileReport {
  seekerId: string;
  technicalSkills: { skill: string; level: string; experience: string }[];
  projects: { name: string; role: string; impact: string }[];
  collaboration: { metric: string; value: string }[];
  growthCurve: { period: string; skills: string[] }[];
  certifications: string[];
  marketValueRange: string;
}

export type NegotiationState =
  | 'INITIATED'
  | 'EMPLOYER_OFFER'
  | 'SEEKER_COUNTER'
  | 'EMPLOYER_COUNTER'
  | 'AGREED'
  | 'FAILED'
  | 'MAX_ROUNDS';

export interface NegotiationSession {
  id: string;
  seekerId: string;
  employerId: string;
  jobId: string;
  state: NegotiationState;
  currentRound: number;
  maxRounds: number;
  onChainTxHash: string | null;
}

export interface NegotiationProposal {
  salary: number;
  remotePolicy: string;
  workingHours: string;
  title: string;
  startDate: string;
  probationMonths: number;
  signingBonus?: number;
  stockOptions?: string;
}

export interface NegotiationRound {
  id: string;
  sessionId: string;
  round: number;
  actor: 'SEEKER_AGENT' | 'EMPLOYER_AGENT';
  proposal: NegotiationProposal;
  reasoning: string;
  decision: 'COUNTER' | 'ACCEPT' | 'REJECT';
}

export interface AgreementRecord {
  sessionId: string;
  agreementHash: string;
  summary: {
    positionTitle: string;
    agreedSalary: number;
    startDate: string;
    negotiationRounds: number;
    remotePolicy: string;
    probationMonths: number;
  };
  seekerApproved: boolean;
  employerApproved: boolean;
  onChainTxHash: string | null;
}

export interface EscrowAccount {
  employerId: string;
  balance: number;
  agentKeySet: boolean;
}

export interface EscrowPayment {
  id: string;
  seekerId: string;
  amount: number;
  timestamp: string;
  txHash: string;
}

export interface EncryptedNegotiationRound {
  id: string;
  sessionId: string;
  round: number;
  actor: 'SEEKER_AGENT' | 'EMPLOYER_AGENT';
  encryptedData: string;
  decision: 'COUNTER' | 'ACCEPT' | 'REJECT';
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
}

export interface JobChatResponse {
  complete: boolean;
  question?: string;
  jobPosting?: JobPosting;
}
