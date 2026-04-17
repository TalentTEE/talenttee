export const ESCROW_PAYMENT = 'ESCROW_PAYMENT';

export interface EscrowPayment {
  checkBalance(employerAccountId: string): Promise<string>;
  payForProfile(employerAccountId: string, seekerAccountId: string): Promise<{ txHash: string }>;
}
