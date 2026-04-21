협상 전 자동 결제 연동 작업해줘.
                                                                                                                                                          
  플로우: RealNegotiationHandoff.createSession()에서 협상 시작 전 profileService.requestAccess() 호출 추가.     
                                                                  
  수정 포인트:
  1. backend/src/negotiation/real-negotiation-handoff.ts — ProfileService 주입, createSession()에서 requestAccess(employerId, seekerId, employerAccountId)
   호출
  2. backend/src/negotiation/negotiation.module.ts — ProfileModule import 또는 ProfileService DI 연결
  3. backend/src/match/match.service.ts — autoNegotiate()에서 employerAccountId (NEAR 계정)도 넘기도록 수정 (현재는 employerId UUID만 넘김)

  주의사항:
  - requestAccess는 이미 중복 체크 있음 (line 29-30) — 이중 결제 안 됨
  - 에스크로 잔액 부족 시 ForbiddenException → autoNegotiate의 catch에서 잡힘 → 나중에 deposit 후 retryNegotiate로 재시도 가능
  - 이력서 데이터는 이미 negotiation.service.ts:191에서 AI 프롬프트에 주입되고 있음 — 추가 작업 불필요
