import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller.js';
import { AuthService } from '../auth.service.js';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../../common/enums/index.js';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    generateChallenge: jest.fn(),
    validateChallenge: jest.fn(),
    verifyNearSignature: jest.fn(),
    findOrCreateUser: jest.fn(),
    findUser: jest.fn(),
    createUser: jest.fn(),
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
    it('should return nonce and expiresAt', async () => {
      const expected = { nonce: 'abc123', expiresAt: '2026-04-12T00:00:00Z' };
      mockAuthService.generateChallenge.mockReturnValue(expected);
      await expect(controller.challenge()).resolves.toEqual(expected);
    });
  });

  describe('POST /auth/near/verify', () => {
    // ── existing tests (preserved) ──

    it('should return JWT and user on valid signature (legacy: no intent = login, existing user)', async () => {
      const user = { id: 'uuid-1', nearAccountId: 'alice.testnet', role: 'SEEKER' };
      mockAuthService.validateChallenge.mockReturnValue(true);
      mockAuthService.verifyNearSignature.mockReturnValue(true);
      mockAuthService.findUser.mockResolvedValue(user);
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

    it('should throw UnauthorizedException on invalid signature', async () => {
      mockAuthService.validateChallenge.mockReturnValue(true);
      mockAuthService.verifyNearSignature.mockReturnValue(false);
      await expect(controller.verify({
        nearAccountId: 'alice.testnet', publicKey: 'ed25519:key',
        signature: 'invalid-sig', nonce: 'abc123', role: 'SEEKER',
      })).rejects.toThrow(UnauthorizedException);
    });

    // ── new tests ──

    it('signup intent + valid role EMPLOYER + non-existing user → calls createUser with EMPLOYER, returns JWT', async () => {
      const newUser = { id: 'uuid-2', nearAccountId: 'bob.testnet', role: UserRole.EMPLOYER };
      mockAuthService.validateChallenge.mockReturnValue(true);
      mockAuthService.verifyNearSignature.mockReturnValue(true);
      mockAuthService.findUser.mockResolvedValue(null);
      mockAuthService.createUser.mockResolvedValue(newUser);
      mockAuthService.generateJwt.mockReturnValue('jwt-employer');

      const result = await controller.verify({
        nearAccountId: 'bob.testnet', publicKey: 'ed25519:key',
        signature: 'valid-sig', nonce: 'nonce1', role: 'EMPLOYER', intent: 'signup',
      });

      expect(mockAuthService.createUser).toHaveBeenCalledWith('bob.testnet', UserRole.EMPLOYER, 'ed25519:key');
      expect(result).toEqual({ jwt: 'jwt-employer', user: newUser });
    });

    it('signup intent + different role + existing user → throws BadRequestException', async () => {
      const existingUser = { id: 'uuid-3', nearAccountId: 'carol.testnet', role: UserRole.EMPLOYER };
      mockAuthService.validateChallenge.mockReturnValue(true);
      mockAuthService.verifyNearSignature.mockReturnValue(true);
      mockAuthService.findUser.mockResolvedValue(existingUser);

      await expect(controller.verify({
        nearAccountId: 'carol.testnet', publicKey: 'ed25519:key',
        signature: 'valid-sig', nonce: 'nonce2', role: 'SEEKER', intent: 'signup',
      })).rejects.toThrow('This account is already registered as EMPLOYER');

      expect(mockAuthService.createUser).not.toHaveBeenCalled();
    });

    it('signup intent + missing role → throws BadRequestException', async () => {
      mockAuthService.validateChallenge.mockReturnValue(true);
      mockAuthService.verifyNearSignature.mockReturnValue(true);

      await expect(controller.verify({
        nearAccountId: 'alice.testnet', publicKey: 'ed25519:key',
        signature: 'valid-sig', nonce: 'nonce3', intent: 'signup',
      })).rejects.toThrow(BadRequestException);
    });

    it('signup intent + role "garbage" → throws BadRequestException', async () => {
      mockAuthService.validateChallenge.mockReturnValue(true);
      mockAuthService.verifyNearSignature.mockReturnValue(true);

      await expect(controller.verify({
        nearAccountId: 'alice.testnet', publicKey: 'ed25519:key',
        signature: 'valid-sig', nonce: 'nonce4', role: 'garbage', intent: 'signup',
      })).rejects.toThrow(BadRequestException);
    });

    it('login intent + existing user → returns JWT with stored role (ignores role in body)', async () => {
      const existingUser = { id: 'uuid-4', nearAccountId: 'dave.testnet', role: UserRole.EMPLOYER };
      mockAuthService.validateChallenge.mockReturnValue(true);
      mockAuthService.verifyNearSignature.mockReturnValue(true);
      mockAuthService.findUser.mockResolvedValue(existingUser);
      mockAuthService.generateJwt.mockReturnValue('jwt-dave');

      const result = await controller.verify({
        nearAccountId: 'dave.testnet', publicKey: 'ed25519:key',
        signature: 'valid-sig', nonce: 'nonce5', role: 'SEEKER', intent: 'login',
      });

      expect(mockAuthService.createUser).not.toHaveBeenCalled();
      expect(result).toEqual({ jwt: 'jwt-dave', user: existingUser });
    });

    it('login intent + non-existing user → throws NotFoundException with "not registered" message', async () => {
      mockAuthService.validateChallenge.mockReturnValue(true);
      mockAuthService.verifyNearSignature.mockReturnValue(true);
      mockAuthService.findUser.mockResolvedValue(null);

      await expect(controller.verify({
        nearAccountId: 'nobody.testnet', publicKey: 'ed25519:key',
        signature: 'valid-sig', nonce: 'nonce6', intent: 'login',
      })).rejects.toThrow(NotFoundException);

      await expect(controller.verify({
        nearAccountId: 'nobody.testnet', publicKey: 'ed25519:key',
        signature: 'valid-sig', nonce: 'nonce6b', intent: 'login',
      })).rejects.toThrow(/not registered/i);
    });

    it('omitted intent (back-compat) + existing user → treated as login, returns JWT', async () => {
      const existingUser = { id: 'uuid-5', nearAccountId: 'alice.testnet', role: UserRole.SEEKER };
      mockAuthService.validateChallenge.mockReturnValue(true);
      mockAuthService.verifyNearSignature.mockReturnValue(true);
      mockAuthService.findUser.mockResolvedValue(existingUser);
      mockAuthService.generateJwt.mockReturnValue('jwt-alice');

      const result = await controller.verify({
        nearAccountId: 'alice.testnet', publicKey: 'ed25519:key',
        signature: 'valid-sig', nonce: 'nonce7',
        // no intent field
      });

      expect(result).toEqual({ jwt: 'jwt-alice', user: existingUser });
    });

    it('omitted intent (back-compat) + non-existing user → throws NotFoundException', async () => {
      mockAuthService.validateChallenge.mockReturnValue(true);
      mockAuthService.verifyNearSignature.mockReturnValue(true);
      mockAuthService.findUser.mockResolvedValue(null);

      await expect(controller.verify({
        nearAccountId: 'new.testnet', publicKey: 'ed25519:key',
        signature: 'valid-sig', nonce: 'nonce8',
        // no intent field
      })).rejects.toThrow(NotFoundException);
    });
  });
});
