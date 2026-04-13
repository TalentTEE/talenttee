export const NEGOTIATION_HANDOFF = 'NEGOTIATION_HANDOFF';

export interface NegotiationHandoff {
  createSession(params: {
    jobId: string;
    seekerId: string;
    employerId: string;
    matchId: string;
  }): Promise<{ sessionId: string }>;
}
