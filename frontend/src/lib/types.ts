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
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
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
  negotiationSessionId?: string;
}

/** Extended match result with joined display fields (not in backend entity) */
export interface MatchResultDisplay extends MatchResult {
  seekerSkills: string[];
  seekerExperienceYears: string;
  jobTitle: string;
  companyName: string;
  jobRequiredSkills: string[];
  jobPreferredSkills: string[];
}

export interface MatchContext {
  annScore: number;
  rerankScore: number;
  seekerSkills: string[];
  seekerSummary: string;
  jobRequiredSkills: string[];
  jobPreferredSkills: string[];
  matchedRequired: string[];
  matchedPreferred: string[];
  missingRequired: string[];
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

export interface NegotiationReasoning {
  summary: string;
  factors: string[];
}

export function isStructuredReasoning(
  reasoning: string | NegotiationReasoning,
): reasoning is NegotiationReasoning {
  return (
    typeof reasoning === 'object' &&
    reasoning !== null &&
    'summary' in reasoning &&
    'factors' in reasoning
  );
}

export interface NegotiationRound {
  id: string;
  sessionId: string;
  round: number;
  actor: 'SEEKER_AGENT' | 'EMPLOYER_AGENT';
  proposal: NegotiationProposal;
  reasoning: string | NegotiationReasoning;
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

/* ── Datasource Detail Types ── */
export interface SkillLevel { name: string; level: number; evidence: string; }
export interface TraitLevel { trait: string; level: number; evidence: string; }

export interface GitHubData {
  profile: { login: string; name: string; bio: string; public_repos: number; followers: number; };
  languages: Record<string, number>;
  repositories: { name: string; description: string; language: string; stars: number; forks: number; topics: string[]; }[];
  contributions: { total_commits_last_year: number; prs_merged: number; issues_closed: number; code_reviews: number; };
  analysis?: {
    skills: SkillLevel[];
    workPatterns: { trait: string; description: string; }[];
    projects: { name: string; role: string; skills: string[]; impact: string; }[];
  };
}

export interface SlackData {
  messages: { id: string; channel: string; text: string; timestamp: string; }[];
  analysis?: {
    communicationStyle: { clarity: number; technicalDepth: number; proactiveness: number; };
    traits: TraitLevel[];
    workAreas: { area: string; messageCount: number; keywords: string[]; }[];
  };
}

export interface DiscordData {
  activities: { id: string; server: string; role: string; messages_count: number; helpful_answers: number; }[];
  analysis?: {
    communityImpact: { totalServers: number; totalMessages: number; totalHelpful: number; helpfulRatio: number; };
    traits: TraitLevel[];
    expertise: { domain: string; confidence: number; source: string; }[];
  };
}

export interface Gov24Data {
  certificates: { name: string; issuer: string; issued_date: string; status: string; }[];
  education: { institution: string; degree: string; graduation_year: number; status: string; }[];
  analysis?: {
    qualifications: TraitLevel[];
  };
}

export type DatasourceDetail = GitHubData | SlackData | DiscordData | Gov24Data;

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
}

export interface JobChatResponse {
  complete: boolean;
  question?: string;
  jobPosting?: JobPosting;
}
