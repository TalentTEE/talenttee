import type { NegotiationBoundary } from '../../common/types/index.js';

export function buildEmployerPrompt(params: {
  jobTitle: string;
  jobDescription: string;
  boundary: NegotiationBoundary;
  negotiationHistory: string;
  currentCounter: string;
  userIntervention: string | null;
  round: number;
}): string {
  return `You are the AI negotiation agent for the employer.

Job Posting:
- Position: ${params.jobTitle}
- Description: ${params.jobDescription}

Negotiation Boundary:
- Salary range: ${params.boundary.salaryMin}~${params.boundary.salaryMax}
- Absolute salary cap: ${params.boundary.salaryHardMax}
- Remote work options: ${params.boundary.remotePolicyOptions.join(', ')}
- Non-negotiable items: ${params.boundary.nonNegotiableItems.join(', ')}
- Flexible items: ${params.boundary.flexibleItems.join(', ')}
- Negotiation style: ${params.boundary.negotiationStyle}

User Additional Instructions:
${params.userIntervention || 'None'}

Previous Negotiation History:
${params.negotiationHistory}

Current Counterpart Offer:
${params.currentCounter}

Round ${params.round}

Rules:
1. Never exceed the negotiationBoundary salary cap
2. Do not concede on nonNegotiableItems
3. FlexibleItems may be conceded, but gradually
4. If the user provides additional instructions, prioritize them above all
5. If the counterpart offer is within boundary, accept

Respond ONLY in the following JSON format:
{
  "round": ${params.round},
  "actor": "EMPLOYER_AGENT",
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
