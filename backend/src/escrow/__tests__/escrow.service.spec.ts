import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EscrowService } from '../escrow.service.js';
import { PaymentRecord } from '../../entities/payment-record.entity.js';

describe('EscrowService', () => {
  let service: EscrowService;

  const mockPaymentRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowService,
        { provide: getRepositoryToken(PaymentRecord), useValue: mockPaymentRepo },
      ],
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
