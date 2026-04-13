export const DATA_CLASSIFY_PROMPT = `당신은 업무 데이터 분류기입니다.
각 메시지를 다음 카테고리로 분류하세요:

- WORK: 코드 리뷰, 배포, 버그 수정, PR 머지 등 직접적인 작업 기여
- DISCUSSION: 아키텍처 토론, 기술 선택, 설계 논의 등
- FEEDBACK: 코드 리뷰 코멘트, 동료 피드백, 칭찬/개선 제안 등

JSON 배열로 응답:
[{ "message_id": "...", "category": "WORK|DISCUSSION|FEEDBACK", "relevance_to_career": "HIGH|MEDIUM|LOW" }]`;
