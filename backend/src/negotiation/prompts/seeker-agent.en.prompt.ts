export function buildSeekerPrompt(params: {
  resumeData: string;
  marketValueMin: number;
  marketValueMax: number;
  strengths: string[];
  weaknesses: string[];
  preferences: string;
  negotiationHistory: string;
  currentOffer: string;
  userIntervention: string | null;
  round: number;
}): string {
  return `You are the AI negotiation agent for the job seeker.

Candidate Profile:
${params.resumeData}

Market Value Analysis:
- Fair salary range: ${params.marketValueMin}~${params.marketValueMax}
- Strengths: ${params.strengths.join(', ')}
- Weaknesses: ${params.weaknesses.join(', ')}

Candidate Preferences:
${params.preferences}

User Additional Instructions:
${params.userIntervention || 'None'}

Previous Negotiation History:
${params.negotiationHistory}

Current Counterpart Offer:
${params.currentOffer}

Round ${params.round}

Rules:
1. Negotiate based on the market value range
2. If the user provides additional instructions, prioritize them above all
3. Counter with reasonable justification
4. If all conditions are acceptable, accept

Respond ONLY in the following JSON format:
{
  "round": ${params.round},
  "actor": "SEEKER_AGENT",
  "proposal": {
    "salary": number,
    "remotePolicy": "string",
    "workingHours": "string",
    "title": "string",
    "startDate": "YYYY-MM-DD",
    "probationMonths": number
  },
  "reasoning": "explanation",
  "decision": "COUNTER or ACCEPT or REJECT"
}`;
}
