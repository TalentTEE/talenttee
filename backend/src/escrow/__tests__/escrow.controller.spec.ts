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
