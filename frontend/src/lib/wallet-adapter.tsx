'use client';

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from 'react';
import { useWeb3Auth } from './web3auth';
import { useWallet } from './wallet-selector';

/* ── Types ── */

export interface UnifiedWalletContextType {
  /** Connected NEAR account ID (implicit hex for Web3Auth, named for wallet-selector) */
  accountId: string | null;
  /** NEAR public key in "ed25519:<base58>" format */
  publicKey: string | null;
  /** Which login method is active */
  loginMethod: 'web3auth' | 'wallet-selector' | null;
  /** Sign a NEP-413 message — returns base64 signature + publicKey */
  signMessage: (params: {
    message: string;
    recipient: string;
    nonce: Buffer;
  }) => Promise<{ signature: string; publicKey: string } | null>;
  /** Sign and send a transaction to NEAR */
  signAndSendTransaction: (params: {
    receiverId: string;
    actions: unknown[];
  }) => Promise<unknown>;
  /** Trigger Web3Auth social login */
  connectWeb3Auth: (loginHint?: 'google' | 'kakao' | 'email_passwordless') => Promise<{
    accountId: string;
    publicKey: string;
  } | null>;
  /** Show the NEAR wallet selector modal */
  showWalletSelector: () => void;
  /** Sign out from whichever method is active */
  signOut: () => Promise<void>;
  /** Social login user info (email, name) — only from Web3Auth */
  socialUserInfo: { email?: string; name?: string } | null;
}

const UnifiedWalletContext = createContext<UnifiedWalletContextType>({
  accountId: null,
  publicKey: null,
  loginMethod: null,
  signMessage: async () => null,
  signAndSendTransaction: async () => null,
  connectWeb3Auth: async () => null,
  showWalletSelector: () => {},
  signOut: async () => {},
  socialUserInfo: null,
});

/* ── NEP-413 signing for Web3Auth (local ed25519 key) ── */

const NEP413_TAG = 2147484061;

/**
 * Build a NEP-413 payload, Borsh-serialize it, SHA-256 hash,
 * then sign with ed25519 detached signature.
 * Must produce byte-identical output to the backend's verifyNearSignature().
 */
async function signNep413Locally(
  message: string,
  recipient: string,
  nonce: Uint8Array,
  secretKey: Uint8Array,
): Promise<{ signature: string; publicKey: string }> {
  // Dynamic imports to keep bundle small
  const [{ serialize }, { sha256 }, { ed25519 }] = await Promise.all([
    import('borsh'),
    import('@noble/hashes/sha2.js'),
    import('@noble/curves/ed25519.js'),
  ]);

  // Must match backend schema exactly
  const nep413Schema = {
    struct: {
      tag: 'u32' as const,
      message: 'string' as const,
      nonce: { array: { type: 'u8' as const, len: 32 } },
      recipient: 'string' as const,
      callbackUrl: { option: 'string' as const },
    },
  };

  const payload = {
    tag: NEP413_TAG,
    message,
    nonce: Array.from(nonce),
    recipient,
    callbackUrl: null,
  };

  const borshPayload = serialize(nep413Schema, payload);
  const hash = sha256(new Uint8Array(borshPayload));

  // ed25519 secretKey from Web3Auth's getED25519Key is 64 bytes
  // (first 32 = seed, last 32 = public key)
  // @noble/curves ed25519.sign expects the 32-byte seed
  const seed = secretKey.slice(0, 32);
  const sigBytes = ed25519.sign(hash, seed);

  // Derive public key from seed for the response
  const pubKeyBytes = ed25519.getPublicKey(seed);

  // Base64-encode signature (matching wallet-selector format)
  const signature = Buffer.from(sigBytes).toString('base64');

  // Base58-encode public key with ed25519: prefix
  const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function b58encode(bytes: Uint8Array): string {
    const digits = [0];
    for (const byte of bytes) {
      let carry = byte;
      for (let j = 0; j < digits.length; j++) {
        carry += digits[j] << 8;
        digits[j] = carry % 58;
        carry = (carry / 58) | 0;
      }
      while (carry > 0) {
        digits.push(carry % 58);
        carry = (carry / 58) | 0;
      }
    }
    let str = '';
    for (const b of bytes) {
      if (b === 0) str += BASE58_ALPHABET[0];
      else break;
    }
    for (let i = digits.length - 1; i >= 0; i--) {
      str += BASE58_ALPHABET[digits[i]];
    }
    return str;
  }

  const publicKey = `ed25519:${b58encode(pubKeyBytes)}`;

  return { signature, publicKey };
}

/* ── Provider ── */

export function UnifiedWalletProvider({ children }: { children: ReactNode }) {
  const web3auth = useWeb3Auth();
  const walletSelector = useWallet();

  // Determine active login method
  const loginMethod: 'web3auth' | 'wallet-selector' | null =
    web3auth.isConnected ? 'web3auth' :
    walletSelector.signedAccountId ? 'wallet-selector' :
    null;

  const accountId = web3auth.isConnected
    ? web3auth.accountId
    : walletSelector.signedAccountId;

  const publicKeyVal = web3auth.isConnected
    ? web3auth.publicKey
    : null; // wallet-selector doesn't expose publicKey directly

  /* ── signMessage ── */
  const signMessage = useCallback(async (params: {
    message: string;
    recipient: string;
    nonce: Buffer;
  }) => {
    if (web3auth.isConnected && web3auth.ed25519SecretKey) {
      // Web3Auth path: sign locally
      return signNep413Locally(
        params.message,
        params.recipient,
        new Uint8Array(params.nonce),
        web3auth.ed25519SecretKey,
      );
    }

    if (walletSelector.selector) {
      // Wallet Selector path: delegate to wallet extension
      const wallet = await walletSelector.selector.wallet();
      if (!wallet.signMessage) {
        throw new Error('This wallet does not support message signing (NEP-413).');
      }
      const signed = await wallet.signMessage({
        message: params.message,
        recipient: params.recipient,
        nonce: params.nonce,
      });
      if (!signed) return null;

      const signature = typeof signed.signature === 'string'
        ? signed.signature
        : Buffer.from(signed.signature).toString('base64');

      return { signature, publicKey: signed.publicKey };
    }

    throw new Error('No wallet connected');
  }, [web3auth.isConnected, web3auth.ed25519SecretKey, walletSelector.selector]);

  /* ── signAndSendTransaction ── */
  const signAndSendTransaction = useCallback(async (params: {
    receiverId: string;
    actions: unknown[];
  }) => {
    if (web3auth.isConnected && web3auth.ed25519SecretKey && web3auth.accountId) {
      // Web3Auth path: use near-api-js directly with the derived key
      const { Account, KeyPairSigner } = await import('near-api-js');
      // @ts-ignore — Vercel TS resolution may miss JsonRpcProvider
      const { JsonRpcProvider } = await import('near-api-js');

      const rpcUrl = process.env.NEXT_PUBLIC_NEAR_RPC_URL || 'https://rpc.testnet.near.org';
      const provider = new JsonRpcProvider({ url: rpcUrl });

      // Build "ed25519:<base58>" secret key string from raw bytes
      const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      function b58encode(bytes: Uint8Array): string {
        const digits = [0];
        for (const byte of bytes) {
          let carry = byte;
          for (let j = 0; j < digits.length; j++) {
            carry += digits[j] << 8;
            digits[j] = carry % 58;
            carry = (carry / 58) | 0;
          }
          while (carry > 0) {
            digits.push(carry % 58);
            carry = (carry / 58) | 0;
          }
        }
        let str = '';
        for (const b of bytes) {
          if (b === 0) str += BASE58_ALPHABET[0];
          else break;
        }
        for (let i = digits.length - 1; i >= 0; i--) {
          str += BASE58_ALPHABET[digits[i]];
        }
        return str;
      }

      const keyString = `ed25519:${b58encode(web3auth.ed25519SecretKey)}`;
      type KeyPairString = `ed25519:${string}`;
      const signer = KeyPairSigner.fromSecretKey(keyString as KeyPairString);
      const account = new Account(web3auth.accountId, provider, signer);

      // Convert actions from wallet-selector format to near-api-js callFunction calls.
      // For now, handle the two action types used by escrow page:
      // 1. functionCall (deposit)
      // 2. addKey (agent key)
      //
      // The wallet-selector actions use actionCreators from @near-js/transactions.
      // We need to inspect the action objects and translate them to near-api-js Account methods.
      //
      // However, for simplicity and since escrow page creates specific action types,
      // we call signAndSendTransaction on the Account object with the raw actions.
      // near-api-js Account.signAndSendTransaction expects similar structure.
      return account.signAndSendTransaction({
        receiverId: params.receiverId,
        actions: params.actions as Parameters<typeof account.signAndSendTransaction>[0]['actions'],
      });
    }

    if (walletSelector.selector) {
      // Wallet Selector path: delegate to wallet
      const wallet = await walletSelector.selector.wallet();
      return wallet.signAndSendTransaction({
        receiverId: params.receiverId,
        actions: params.actions as Parameters<typeof wallet.signAndSendTransaction>[0]['actions'],
      });
    }

    throw new Error('No wallet connected');
  }, [web3auth.isConnected, web3auth.ed25519SecretKey, web3auth.accountId, walletSelector.selector]);

  /* ── connectWeb3Auth ── */
  const connectWeb3Auth = useCallback(async (loginHint?: 'google' | 'kakao' | 'email_passwordless') => {
    const result = await web3auth.connect(loginHint);
    if (!result) return null;
    return { accountId: result.accountId, publicKey: result.publicKey };
  }, [web3auth]);

  /* ── showWalletSelector ── */
  const showWalletSelector = useCallback(() => {
    walletSelector.modal?.show();
  }, [walletSelector.modal]);

  /* ── signOut ── */
  const signOut = useCallback(async () => {
    if (web3auth.isConnected) {
      await web3auth.disconnect();
    }
    await walletSelector.signOut();
  }, [web3auth, walletSelector]);

  return (
    <UnifiedWalletContext.Provider
      value={{
        accountId,
        publicKey: publicKeyVal,
        loginMethod,
        signMessage,
        signAndSendTransaction,
        connectWeb3Auth,
        showWalletSelector,
        signOut,
        socialUserInfo: web3auth.isConnected ? web3auth.userInfo : null,
      }}
    >
      {children}
    </UnifiedWalletContext.Provider>
  );
}

export function useUnifiedWallet() {
  return useContext(UnifiedWalletContext);
}
