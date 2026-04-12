# Phase 2: NEAR Auth — NEP-413 + JWT (Day 1 오후)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `POST /auth/near/challenge` + `POST /auth/near/verify` API 완성, JwtGuard 제공
**선행:** Phase 1 (User 엔티티)
**완료 기준:** Auth 테스트 전부 통과, 현정이 JwtGuard import 가능
**예상 소요:** ~40분

---

## Task 2.1: AuthService — Challenge + JWT 발급

**Files:**
- Create: `backend/src/auth/auth.service.ts`
- Test: `backend/src/auth/__tests__/auth.service.spec.ts`

- [ ] **Step 1: Auth 서비스 테스트 작성**

```typescript
// backend/src/auth/__tests__/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from '../auth.service.js';
import { User } from '../../entities/user.entity.js';
import { UserRole } from '../../common/enums/index.js';

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('generateChallenge', () => {
    it('should return nonce and expiresAt', () => {
      const result = service.generateChallenge();
      expect(result).toHaveProperty('nonce');
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.nonce).toBe('string');
      expect(result.nonce.length).toBeGreaterThan(0);
    });

    it('should set expiry ~5 minutes from now', () => {
      const before = Date.now();
      const result = service.generateChallenge();
      const expiresAt = new Date(result.expiresAt).getTime();
      expect(expiresAt).toBeGreaterThanOrEqual(before + 290000);
      expect(expiresAt).toBeLessThanOrEqual(before + 310000);
    });
  });

  describe('findOrCreateUser', () => {
    it('should return existing user if found', async () => {
      const existing = { id: 'uuid-1', nearAccountId: 'alice.testnet', role: UserRole.SEEKER };
      mockUserRepo.findOne.mockResolvedValue(existing);

      const result = await service.findOrCreateUser('alice.testnet', UserRole.SEEKER, 'ed25519:key');
      expect(result).toEqual(existing);
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    it('should create new user if not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      const newUser = { id: 'uuid-2', nearAccountId: 'bob.testnet', role: UserRole.EMPLOYER, publicKey: 'ed25519:key2' };
      mockUserRepo.create.mockReturnValue(newUser);
      mockUserRepo.save.mockResolvedValue(newUser);

      const result = await service.findOrCreateUser('bob.testnet', UserRole.EMPLOYER, 'ed25519:key2');
      expect(result).toEqual(newUser);
      expect(mockUserRepo.save).toHaveBeenCalled();
    });
  });

  describe('generateJwt', () => {
    it('should sign JWT with correct payload', () => {
      const user = { nearAccountId: 'alice.testnet', role: UserRole.SEEKER, publicKey: 'ed25519:key' } as User;
      const token = service.generateJwt(user);

      expect(token).toBe('mock-jwt-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'alice.testnet',
        role: UserRole.SEEKER,
        publicKey: 'ed25519:key',
      });
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd backend && npx jest src/auth/__tests__/auth.service.spec.ts --no-cache`
Expected: FAIL

- [ ] **Step 3: AuthService 구현**

```typescript
// backend/src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { User } from '../entities/user.entity.js';
import { UserRole } from '../common/enums/index.js';

@Injectable()
export class AuthService {
  private challenges = new Map<string, { nonce: string; expiresAt: Date }>();

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  generateChallenge(): { nonce: string; expiresAt: string } {
    const nonce = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.challenges.set(nonce, { nonce, expiresAt });
    return { nonce, expiresAt: expiresAt.toISOString() };
  }

  validateChallenge(nonce: string): boolean {
    const challenge = this.challenges.get(nonce);
    if (!challenge) return false;
    if (new Date() > challenge.expiresAt) {
      this.challenges.delete(nonce);
      return false;
    }
    this.challenges.delete(nonce);
    return true;
  }

  async findOrCreateUser(nearAccountId: string, role: UserRole, publicKey: string): Promise<User> {
    let user = await this.userRepo.findOne({ where: { nearAccountId } });
    if (!user) {
      user = this.userRepo.create({ nearAccountId, role, publicKey });
      user = await this.userRepo.save(user);
    }
    return user;
  }

  generateJwt(user: User): string {
    return this.jwtService.sign({
      sub: user.nearAccountId,
      role: user.role,
      publicKey: user.publicKey,
    });
  }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd backend && npx jest src/auth/__tests__/auth.service.spec.ts --no-cache`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/auth.service.ts backend/src/auth/__tests__/auth.service.spec.ts
git commit -m "feat: add AuthService with challenge generation and JWT"
```

---

## Task 2.2: AuthController — challenge/verify 엔드포인트

**Files:**
- Create: `backend/src/auth/auth.controller.ts`
- Test: `backend/src/auth/__tests__/auth.controller.spec.ts`

- [ ] **Step 1: Auth 컨트롤러 테스트 작성**

```typescript
// backend/src/auth/__tests__/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller.js';
import { AuthService } from '../auth.service.js';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    generateChallenge: jest.fn(),
    validateChallenge: jest.fn(),
    findOrCreateUser: jest.fn(),
    generateJwt: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();
    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('POST /auth/near/challenge', () => {
    it('should return nonce and expiresAt', () => {
      const expected = { nonce: 'abc123', expiresAt: '2026-04-12T00:00:00Z' };
      mockAuthService.generateChallenge.mockReturnValue(expected);
      expect(controller.challenge()).toEqual(expected);
    });
  });

  describe('POST /auth/near/verify', () => {
    it('should return JWT and user on valid signature', async () => {
      const user = { id: 'uuid-1', nearAccountId: 'alice.testnet', role: 'SEEKER' };
      mockAuthService.validateChallenge.mockReturnValue(true);
      mockAuthService.findOrCreateUser.mockResolvedValue(user);
      mockAuthService.generateJwt.mockReturnValue('jwt-token');

      const result = await controller.verify({
        nearAccountId: 'alice.testnet', publicKey: 'ed25519:key',
        signature: 'valid-sig', nonce: 'abc123', role: 'SEEKER',
      });
      expect(result).toEqual({ jwt: 'jwt-token', user });
    });

    it('should throw UnauthorizedException on invalid challenge', async () => {
      mockAuthService.validateChallenge.mockReturnValue(false);
      await expect(controller.verify({
        nearAccountId: 'alice.testnet', publicKey: 'ed25519:key',
        signature: 'bad-sig', nonce: 'expired', role: 'SEEKER',
      })).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `cd backend && npx jest src/auth/__tests__/auth.controller.spec.ts --no-cache`
Expected: FAIL

- [ ] **Step 3: AuthController 구현**

```typescript
// backend/src/auth/auth.controller.ts
import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UserRole } from '../common/enums/index.js';

@Controller('auth/near')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('challenge')
  challenge() {
    return this.authService.generateChallenge();
  }

  @Post('verify')
  async verify(
    @Body() body: {
      nearAccountId: string; publicKey: string;
      signature: string; nonce: string; role: string;
    },
  ) {
    const isValidChallenge = this.authService.validateChallenge(body.nonce);
    if (!isValidChallenge) {
      throw new UnauthorizedException('Invalid or expired challenge nonce');
    }

    // TODO: near-sign-verify로 실제 Ed25519 서명 검증
    // PoC에서는 challenge 유효성만 확인

    const role = body.role === 'EMPLOYER' ? UserRole.EMPLOYER : UserRole.SEEKER;
    const user = await this.authService.findOrCreateUser(body.nearAccountId, role, body.publicKey);
    const jwt = this.authService.generateJwt(user);
    return { jwt, user };
  }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

Run: `cd backend && npx jest src/auth/__tests__/auth.controller.spec.ts --no-cache`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/auth.controller.ts backend/src/auth/__tests__/auth.controller.spec.ts
git commit -m "feat: add AuthController with challenge/verify endpoints"
```

---

## Task 2.3: JWT Strategy + Guard + Auth Module 등록

**Files:**
- Create: `backend/src/auth/jwt.strategy.ts`
- Create: `backend/src/auth/jwt.guard.ts`
- Create: `backend/src/auth/auth.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: JWT Strategy 구현**

```typescript
// backend/src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../common/types/index.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-me',
    });
  }

  validate(payload: JwtPayload) {
    return { nearAccountId: payload.sub, role: payload.role, publicKey: payload.publicKey };
  }
}
```

- [ ] **Step 2: JWT Guard 구현**

```typescript
// backend/src/auth/jwt.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 3: Auth Module 작성**

```typescript
// backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { JwtGuard } from './jwt.guard.js';
import { User } from '../entities/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtGuard],
  exports: [AuthService, JwtGuard],
})
export class AuthModule {}
```

- [ ] **Step 4: AppModule에 AuthModule 등록**

```typescript
// backend/src/app.module.ts — imports에 추가
import { AuthModule } from './auth/auth.module.js';
// imports 배열에 AuthModule 추가
```

- [ ] **Step 5: JwtGuard 테스트**

```typescript
// backend/src/auth/__tests__/jwt.guard.spec.ts
import { JwtGuard } from '../jwt.guard.js';

describe('JwtGuard', () => {
  it('should be defined', () => {
    expect(new JwtGuard()).toBeDefined();
  });
});
```

Run: `cd backend && npx jest src/auth/__tests__/jwt.guard.spec.ts --no-cache`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/auth/ backend/src/app.module.ts
git commit -m "feat: add JWT strategy, guard, and Auth module registration"
```

---

## Phase 2 완료 기준

- [ ] `POST /auth/near/challenge` → nonce + expiresAt 반환
- [ ] `POST /auth/near/verify` → 유효한 nonce 시 JWT + User 반환
- [ ] `POST /auth/near/verify` → 무효한 nonce 시 401 반환
- [ ] JwtGuard export → 다른 모듈에서 `@UseGuards(JwtGuard)` 사용 가능
- [ ] 모든 Auth 테스트 통과
- [ ] 팀에 "Phase 2 완료 — Auth API + JwtGuard 사용 가능" 공유
