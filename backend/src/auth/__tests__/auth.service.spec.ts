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
      const user = { id: 'uuid-123', nearAccountId: 'alice.testnet', role: UserRole.SEEKER, publicKey: 'ed25519:key' } as User;
      const token = service.generateJwt(user);

      expect(token).toBe('mock-jwt-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'uuid-123',
        nearAccountId: 'alice.testnet',
        role: UserRole.SEEKER,
        publicKey: 'ed25519:key',
      });
    });
  });
});
