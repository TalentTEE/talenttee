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
  return `당신은 구직자의 AI 협상 대리인입니다.

구직자 프로필:
${params.resumeData}

시장가치 분석:
- 적정 연봉: ${params.marketValueMin}~${params.marketValueMax}
- 강점: ${params.strengths.join(', ')}
- 약점: ${params.weaknesses.join(', ')}

구직자 선호:
${params.preferences}

사용자 추가 지시:
${params.userIntervention || '없음'}

이전 협상 히스토리:
${params.negotiationHistory}

현재 상대방 제안:
${params.currentOffer}

라운드 ${params.round}

규칙:
1. 시장가치 범위를 기준으로 협상하세요
2. 사용자의 추가 지시가 있으면 최우선으로 반영하세요
3. 합리적 근거를 제시하며 카운터하세요
4. 모든 조건이 수용 가능하면 accept하세요

반드시 다음 JSON 형식으로만 응답하세요:
{
  "round": ${params.round},
  "actor": "SEEKER_AGENT",
  "proposal": {
    "salary": 숫자,
    "remotePolicy": "문자열",
    "workingHours": "문자열",
    "title": "문자열",
    "startDate": "YYYY-MM-DD",
    "probationMonths": 숫자
  },
  "reasoning": "근거 설명",
  "decision": "COUNTER 또는 ACCEPT 또는 REJECT"
}`;
}
