export const ESCROW_PAYMENT = 'ESCROW_PAYMENT';

export interface EscrowPayment {
  checkBalance(employerAccountId: string): Promise<string>;
  payForProfile(employerAccountId: string, amount: string): Promise<{ txHash: string }>;
}
