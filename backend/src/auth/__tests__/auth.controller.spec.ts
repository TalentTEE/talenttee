import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller.js';
import { AuthService } from '../auth.service.js';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    generateChallenge: jest.fn(),
    validateChallenge: jest.fn(),
    verifyNearSignature: jest.fn(),
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
      mockAuthService.verifyNearSignature.mockReturnValue(true);
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
