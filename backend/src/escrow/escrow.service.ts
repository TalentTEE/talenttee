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
    if (data.error || !data.result?.result) return '0';

    try {
      const result = JSON.parse(Buffer.from(data.result.result).toString('utf-8'));
      return String(result);
    } catch {
      return '0';
    }
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
