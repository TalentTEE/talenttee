// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — near-api-js v7 re-exports JsonRpcProvider but Vercel TS resolution misses it
import { Account, JsonRpcProvider, KeyPairSigner, nearToYocto, type KeyPairString } from 'near-api-js';

const ESCROW_CONTRACT_ID =
  process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID || 'escrow.testnet';

const NEAR_RPC_URL =
  process.env.NEXT_PUBLIC_NEAR_RPC_URL || 'https://rpc.testnet.near.org';

function getProvider(): JsonRpcProvider {
  return new JsonRpcProvider({ url: NEAR_RPC_URL });
}

/**
 * Create an Account instance with a signer for signing transactions.
 * Requires a NEAR account ID and an Ed25519 private key string
 * (format: "ed25519:<base58-encoded-key>").
 */
export function getSignerAccount(accountId: string, privateKey: string): Account {
  const provider = getProvider();
  const signer = KeyPairSigner.fromSecretKey(privateKey as KeyPairString);
  return new Account(accountId, provider, signer);
}

/**
 * Deposit NEAR into the escrow contract.
 * @param accountId - The depositor's NEAR account ID
 * @param privateKey - Ed25519 private key string (ed25519:...)
 * @param amountNear - Amount in NEAR (e.g. "1.5")
 * @returns Transaction response
 */
export async function depositViaWallet(
  accountId: string,
  privateKey: string,
  amountNear: string,
) {
  const account = getSignerAccount(accountId, privateKey);
  return account.callFunction({
    contractId: ESCROW_CONTRACT_ID,
    methodName: 'deposit',
    args: {},
    deposit: nearToYocto(parseFloat(amountNear)),
  });
}

/**
 * Add a FunctionCall Access Key that authorises an agent to call
 * `pay_for_profile` on the escrow contract on behalf of the employer.
 *
 * This is NOT a contract method — it uses the NEAR protocol's addKey action
 * to grant a limited-permission key directly on the employer's account.
 *
 * @param accountId - The employer's NEAR account ID
 * @param privateKey - Ed25519 private key string (ed25519:...)
 * @param agentPublicKey - The agent's public key to authorize
 * @returns Transaction response
 */
export async function addAgentKey(
  accountId: string,
  privateKey: string,
  agentPublicKey: string,
) {
  const account = getSignerAccount(accountId, privateKey);
  return account.addFunctionCallAccessKey({
    publicKey: agentPublicKey,
    contractId: ESCROW_CONTRACT_ID,
    methodNames: ['pay_for_profile'],
    allowance: nearToYocto(5),
  });
}

/**
 * View the escrow balance for an employer via RPC (no signing needed).
 * @param employerId - The employer's NEAR account ID
 * @returns Balance in yoctoNEAR as string
 */
export async function getEscrowBalanceOnChain(
  employerId: string,
): Promise<string> {
  const provider = getProvider();
  const result = await provider.callFunction<string>({
    contractId: ESCROW_CONTRACT_ID,
    method: 'get_balance',
    args: { employer_id: employerId },
  });
  return result ?? '0';
}

/**
 * Check if a specific public key is registered as a FunctionCall access key
 * for pay_for_profile on the employer's account (on-chain check).
 */
export async function hasAgentKeyOnChain(
  accountId: string,
  agentPublicKey: string,
): Promise<boolean> {
  try {
    const res = await fetch(NEAR_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'check-agent-key',
        method: 'query',
        params: {
          request_type: 'view_access_key_list',
          finality: 'final',
          account_id: accountId,
        },
      }),
    });
    const json = await res.json();
    const keys: Array<{
      public_key: string;
      access_key: {
        permission: 'FullAccess' | {
          FunctionCall: {
            receiver_id: string;
            method_names: string[];
          };
        };
      };
    }> = json.result?.keys ?? [];

    return keys.some(
      (k) =>
        k.public_key === agentPublicKey &&
        typeof k.access_key.permission === 'object' &&
        'FunctionCall' in k.access_key.permission &&
        k.access_key.permission.FunctionCall.receiver_id === ESCROW_CONTRACT_ID &&
        k.access_key.permission.FunctionCall.method_names.includes('pay_for_profile'),
    );
  } catch {
    return false;
  }
}
