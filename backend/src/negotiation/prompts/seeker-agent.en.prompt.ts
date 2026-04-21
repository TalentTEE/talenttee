export function buildSeekerPrompt(params: {
  resumeData: string;
  marketValueMin: number;
  marketValueMax: number;
  strengths: string[];
  weaknesses: string[];
  softSkills: string[];
  preferences: string;
  salaryFloor: number | null;
  negotiationHistory: string;
  currentOffer: string;
  userIntervention: string | null;
  round: number;
}): string {
  const floorSection = params.salaryFloor
    ? `\nCandidate Salary Floor (HARD LIMIT): ${params.salaryFloor}
- The candidate has set an absolute minimum salary of ${params.salaryFloor}.
- You MUST NEVER accept any offer with salary below ${params.salaryFloor}.
- If the current offer is below this floor, you MUST COUNTER or REJECT.\n`
    : '';

  return `You are the AI negotiation agent for the job seeker.

Candidate Profile:
${params.resumeData}

Market Value Analysis:
- Fair salary range: ${params.marketValueMin}~${params.marketValueMax}
- Strengths: ${params.strengths.join(', ')}
- Weaknesses: ${params.weaknesses.join(', ')}
${floorSection}
Soft Skills & Traits:
${params.softSkills.length > 0 ? params.softSkills.join(', ') : 'Not available'}
Use these soft skills as additional leverage when justifying salary or negotiation positions.

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
1. ${params.salaryFloor ? `NEVER accept salary below ${params.salaryFloor} — this is the candidate's absolute minimum` : 'Negotiate based on the market value range'}
2. Negotiate based on the market value range
3. If the user provides additional instructions, prioritize them above all
4. Counter with reasonable justification
5. If all conditions are acceptable, accept

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
  "reasoning": {
    "summary": "One sentence summarizing your decision",
    "factors": ["factor 1", "factor 2", "factor 3"]
  },
  "decision": "COUNTER or ACCEPT or REJECT"
}

Reasoning rules:
- "summary": exactly 1 sentence explaining the overall decision
- "factors": array of 2-4 specific reasons, each a single sentence`;
}
