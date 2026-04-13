import { Injectable } from '@nestjs/common';
import { EscrowPayment } from '../interfaces/escrow-payment.interface.js';
import { randomUUID } from 'crypto';

@Injectable()
export class MockEscrowPayment implements EscrowPayment {
  async checkBalance(_employerAccountId: string): Promise<string> {
    // 10 NEAR in yoctoNEAR
    return '10000000000000000000000000';
  }

  async payForProfile(
    _employerAccountId: string,
    _amount: string,
  ): Promise<{ txHash: string }> {
    return { txHash: randomUUID().replace(/-/g, '') };
  }
}
