# Phase 4: Escrow API + 백엔드 통합 (Day 2 오후)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Escrow 잔액 조회 API, deposit 트랜잭션 파라미터 API 완성
**선행:** Phase 2 (JwtGuard), Phase 3 (컨트랙트 ABI)
**완료 기준:** Escrow API 테스트 통과, 전체 백엔드 빌드 성공
**예상 소요:** ~30분

---

## Task 4.1: Escrow Service + Controller

**Files:**
- Create: `backend/src/escrow/escrow.service.ts`
- Create: `backend/src/escrow/escrow.controller.ts`
- Create: `backend/src/escrow/escrow.module.ts`
- Modify: `backend/src/app.module.ts`
- Test: `backend/src/escrow/__tests__/escrow.service.spec.ts`
- Test: `backend/src/escrow/__tests__/escrow.controller.spec.ts`

- [ ] **Step 1: Escrow 서비스 테스트 작성**

```typescript
// backend/src/escrow/__tests__/escrow.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EscrowService } from '../escrow.service.js';

describe('EscrowService', () => {
  let service: EscrowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EscrowService],
    }).compile();
    service = module.get<EscrowService>(EscrowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have getBalance method', () => {
    expect(typeof service.getBalance).toBe('function');
  });

  it('should return deposit tx params', () => {
    const params = service.getDepositTxParams('1000000000000000000000000');
    expect(params.methodName).toBe('deposit');
    expect(params.deposit).toBe('1000000000000000000000000');
    expect(params.contractId).toContain('escrow');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd backend && npx jest src/escrow/__tests__/escrow.service.spec.ts --no-cache`
Expected: FAIL

- [ ] **Step 3: EscrowService 구현**

```typescript
// backend/src/escrow/escrow.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class EscrowService {
  private readonly escrowContractId =
    process.env.ESCROW_CONTRACT_ID || 'escrow.testnet';
  private readonly nearNodeUrl =
    process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org';

  async getBalance(employerAccountId: string): Promise<string> {
    const response = await fetch(this.nearNodeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'dontcare',
        method: 'query',
        params: {
          request_type: 'call_function',
          finality: 'final',
          account_id: this.escrowContractId,
          method_name: 'get_balance',
          args_base64: Buffer.from(
            JSON.stringify({ employer_id: employerAccountId }),
          ).toString('base64'),
        },
      }),
    });

    const data = await response.json();
    if (data.error) return '0';

    const result = JSON.parse(Buffer.from(data.result.result).toString('utf-8'));
    return String(result);
  }

  getDepositTxParams(amount: string) {
    return {
      contractId: this.escrowContractId,
      methodName: 'deposit',
      args: {},
      deposit: amount,
    };
  }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd backend && npx jest src/escrow/__tests__/escrow.service.spec.ts --no-cache`
Expected: PASS

- [ ] **Step 5: Escrow 컨트롤러 테스트 작성**

```typescript
// backend/src/escrow/__tests__/escrow.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EscrowController } from '../escrow.controller.js';
import { EscrowService } from '../escrow.service.js';

describe('EscrowController', () => {
  let controller: EscrowController;

  const mockEscrowService = {
    getBalance: jest.fn().mockResolvedValue('1000000000000000000000000'),
    getDepositTxParams: jest.fn().mockReturnValue({
      contractId: 'escrow.testnet',
      methodName: 'deposit',
      args: {},
      deposit: '1000000000000000000000000',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EscrowController],
      providers: [{ provide: EscrowService, useValue: mockEscrowService }],
    }).compile();
    controller = module.get<EscrowController>(EscrowController);
  });

  it('GET /escrow/balance should return balance', async () => {
    const result = await controller.getBalance('employer.testnet');
    expect(result).toEqual({ balance: '1000000000000000000000000' });
  });

  it('POST /escrow/deposit should return tx params', () => {
    const result = controller.getDepositParams({ amount: '1000000000000000000000000' });
    expect(result.contractId).toBe('escrow.testnet');
    expect(result.methodName).toBe('deposit');
  });
});
```

- [ ] **Step 6: 테스트 실행 — 실패 확인**

Run: `cd backend && npx jest src/escrow/__tests__/escrow.controller.spec.ts --no-cache`
Expected: FAIL

- [ ] **Step 7: EscrowController 구현**

```typescript
// backend/src/escrow/escrow.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { EscrowService } from './escrow.service.js';
import { JwtGuard } from '../auth/jwt.guard.js';

@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @UseGuards(JwtGuard)
  @Get('balance')
  async getBalance(@Query('accountId') accountId: string) {
    const balance = await this.escrowService.getBalance(accountId);
    return { balance };
  }

  @UseGuards(JwtGuard)
  @Post('deposit')
  getDepositParams(@Body() body: { amount: string }) {
    return this.escrowService.getDepositTxParams(body.amount);
  }
}
```

- [ ] **Step 8: 테스트 실행 — 통과 확인**

Run: `cd backend && npx jest src/escrow/__tests__/escrow.controller.spec.ts --no-cache`
Expected: PASS

- [ ] **Step 9: EscrowModule + AppModule 등록**

```typescript
// backend/src/escrow/escrow.module.ts
import { Module } from '@nestjs/common';
import { EscrowController } from './escrow.controller.js';
import { EscrowService } from './escrow.service.js';

@Module({
  controllers: [EscrowController],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}
```

`backend/src/app.module.ts`에 추가:
```typescript
import { EscrowModule } from './escrow/escrow.module.js';
// imports 배열에 EscrowModule 추가
```

- [ ] **Step 10: Commit**

```bash
git add backend/src/escrow/ backend/src/app.module.ts
git commit -m "feat: add Escrow API with balance query and deposit params"
```

---

## Task 4.2: 전체 빌드 + 테스트 검증

- [ ] **Step 1: 전체 백엔드 테스트 실행**

Run: `cd backend && npx jest --passWithNoTests`
Expected: 모든 테스트 PASS

- [ ] **Step 2: 백엔드 빌드 확인**

Run: `cd backend && npx nest build`
Expected: 에러 없이 빌드 완료

- [ ] **Step 3: Commit (필요 시)**

```bash
git add -A
git commit -m "chore: verify all builds and tests pass for Phase 1-4"
```

---

## Phase 4 완료 기준

- [ ] `GET /escrow/balance?accountId=xxx` → 잔액 반환 (JwtGuard 보호)
- [ ] `POST /escrow/deposit` → 프론트엔드용 트랜잭션 파라미터 반환
- [ ] 전체 백엔드 테스트 통과
- [ ] `npx nest build` 에러 없음
- [ ] 팀에 "Phase 4 완료 — Escrow API 사용 가능" 공유
