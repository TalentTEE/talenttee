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

export interface NegotiationBoundary {
  salaryMin: number;
  salaryMax: number;
  salaryHardMax: number;
  remotePolicyOptions: string[];
  nonNegotiableItems: string[];
  flexibleItems: string[];
  negotiationStyle: 'conservative' | 'moderate' | 'aggressive';
}

export interface NegotiationReasoning {
  summary: string;
  factors: string[];
}

export interface AgentResponse {
  round: number;
  actor: 'SEEKER_AGENT' | 'EMPLOYER_AGENT';
  proposal: NegotiationProposal;
  reasoning: string | NegotiationReasoning;
  decision: 'COUNTER' | 'ACCEPT' | 'REJECT';
}

export interface JwtPayload {
  sub: string; // user UUID
  nearAccountId: string;
  role: 'SEEKER' | 'EMPLOYER';
  publicKey: string;
}
