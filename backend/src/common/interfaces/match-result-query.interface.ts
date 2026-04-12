export const MATCH_RESULT_QUERY = 'MATCH_RESULT_QUERY';

export interface SeekerProfile {
  resumeData: string;
  marketValueMin: number;
  marketValueMax: number;
  strengths: string[];
  weaknesses: string[];
  preferences: string;
}

export interface MatchResultQuery {
  getSeekerProfile(seekerId: string): Promise<SeekerProfile>;
}
