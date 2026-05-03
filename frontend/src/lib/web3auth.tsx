'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

/* ── Types (avoid importing heavy modules at module scope) ── */

interface Web3AuthState {
  isInitialized: boolean;
  isConnected: boolean;
  accountId: string | null;
  publicKey: string | null;      // "ed25519:<base58>" format
  ed25519SecretKey: Uint8Array | null;
  userInfo: { email?: string; name?: string } | null;
  connect: (loginHint?: 'google' | 'kakao' | 'email_passwordless') => Promise<{
    accountId: string;
    publicKey: string;
    secretKey: Uint8Array;
  } | null>;
  disconnect: () => Promise<void>;
}

const Web3AuthContext = createContext<Web3AuthState>({
  isInitialized: false,
  isConnected: false,
  accountId: null,
  publicKey: null,
  ed25519SecretKey: null,
  userInfo: null,
  connect: async () => null,
  disconnect: async () => {},
});

/* ── Lazy-loaded SDK modules ── */

type Web3AuthInstance = {
  init: () => Promise<void>;
  connect: () => Promise<unknown>;
  connectTo: (walletName: string, loginParams?: { authConnection?: string }) => Promise<unknown>;
  getUserInfo: () => Promise<{ email?: string; name?: string; [k: string]: unknown }>;
  logout: () => Promise<void>;
  provider: { request: (args: { method: string }) => Promise<unknown> } | null;
  connected: boolean;
};

/**
 * Dynamically import Web3Auth SDK to keep the initial bundle small.
 * Only loaded when user actually clicks a social login button.
 */
async function loadWeb3AuthSDK() {
  const [
    { Web3Auth, getED25519Key, CHAIN_NAMESPACES, WALLET_CONNECTORS },
  ] = await Promise.all([
    import('@web3auth/modal'),
  ]);
  return { Web3Auth, getED25519Key, CHAIN_NAMESPACES, WALLET_CONNECTORS };
}

/* ── Helper: Uint8Array → hex ── */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/* ── Base58 encode (same alphabet as bs58 / NEAR) ── */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Encode(bytes: Uint8Array): string {
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

/* ── Provider ── */

export function Web3AuthProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [ed25519SecretKey, setEd25519SecretKey] = useState<Uint8Array | null>(null);
  const [userInfo, setUserInfo] = useState<{ email?: string; name?: string } | null>(null);

  const web3authRef = useRef<Web3AuthInstance | null>(null);
  const sdkRef = useRef<Awaited<ReturnType<typeof loadWeb3AuthSDK>> | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || '';
  const network = process.env.NEXT_PUBLIC_WEB3AUTH_NETWORK === 'sapphire_mainnet'
    ? 'sapphire_mainnet'
    : 'sapphire_devnet';

  /** Derive ed25519 keypair from the secp256k1 key Web3Auth provides */
  const deriveNearKeys = useCallback(async (
    provider: { request: (args: { method: string }) => Promise<unknown> },
    sdk: Awaited<ReturnType<typeof loadWeb3AuthSDK>>,
  ) => {
    // Web3Auth v10/auth connector supports private key RPC methods,
    // but injected external wallets (MetaMask, etc.) do not.
    // Try both known methods, then fail with a clear message.
    let secp256k1Key: string | null = null;
    let lastErr: unknown;
    for (const method of ['private_key', 'eth_private_key']) {
      try {
        const raw = await provider.request({ method });
        if (typeof raw === 'string' && raw.length > 0) {
          secp256k1Key = raw;
          break;
        }
      } catch (err) {
        lastErr = err;
      }
    }

    if (!secp256k1Key) {
      const detail = lastErr instanceof Error ? lastErr.message : 'unknown error';
      throw new Error(`Web3Auth key extraction failed (${detail}). Please use a social login provider (Google/Kakao/Email), not an injected wallet.`);
    }

    // Convert to ed25519 using Web3Auth's built-in utility
    const ed25519Result = sdk.getED25519Key(secp256k1Key);
    // ed25519Result.sk is a 64-byte Buffer (secretKey + publicKey concatenated)
    // ed25519Result.pk is the 32-byte public key
    const sk = new Uint8Array(ed25519Result.sk);
    const pk = new Uint8Array(ed25519Result.pk);

    // NEAR implicit account ID = hex encoding of public key
    const implicitAccountId = bytesToHex(pk);

    // NEAR public key format: "ed25519:<base58(publicKey)>"
    const nearPublicKey = `ed25519:${base58Encode(pk)}`;

    return { accountId: implicitAccountId, publicKey: nearPublicKey, secretKey: sk };
  }, []);

  /** Initialize the SDK (lazy, once) */
  const ensureInit = useCallback(async () => {
    if (web3authRef.current) return;
    if (initPromiseRef.current) {
      await initPromiseRef.current;
      return;
    }

    if (!clientId) {
      console.warn('[Web3Auth] No client ID configured — social login disabled');
      return;
    }

    initPromiseRef.current = (async () => {
      const sdk = await loadWeb3AuthSDK();
      sdkRef.current = sdk;

      const instance = new sdk.Web3Auth({
        clientId,
        web3AuthNetwork: network,
        chainConfig: {
          chainNamespace: sdk.CHAIN_NAMESPACES.OTHER,
          chainId: '0x4e454153', // "NEAS" in hex — NEAR chain identifier
          rpcTarget: 'https://rpc.testnet.near.org',
          displayName: 'NEAR Testnet',
          ticker: 'NEAR',
          tickerName: 'NEAR',
        },
      } as unknown as ConstructorParameters<typeof sdk.Web3Auth>[0]) as unknown as Web3AuthInstance;

      await instance.init();
      web3authRef.current = instance;
      setIsInitialized(true);

      // If user was previously connected (session persisted), restore state
      if (instance.connected && instance.provider) {
        try {
          const keys = await deriveNearKeys(instance.provider, sdk);
          const info = await instance.getUserInfo();
          setAccountId(keys.accountId);
          setPublicKey(keys.publicKey);
          setEd25519SecretKey(keys.secretKey);
          setUserInfo({ email: info.email, name: info.name });
          setIsConnected(true);
        } catch {
          // Session expired — ignore
        }
      }
    })();

    await initPromiseRef.current;
  }, [clientId, network, deriveNearKeys]);

  // Initialize on mount (lazy — doesn't block rendering)
  useEffect(() => {
    if (clientId) {
      ensureInit().catch(() => {});
    }
  }, [clientId, ensureInit]);

  const connect = useCallback(async (loginHint?: 'google' | 'kakao' | 'email_passwordless') => {
    await ensureInit();
    const instance = web3authRef.current;
    const sdk = sdkRef.current;
    if (!instance || !sdk) return null;

    // If a stale session persists, reuse existing provider or logout first
    let provider: unknown;
    if (instance.connected && instance.provider) {
      // Already connected — reuse the existing provider
      provider = instance.provider;
    } else {
      // Clear any half-connected state before attempting fresh login
      if (instance.connected) {
        try { await instance.logout(); } catch { /* ignore */ }
      }
      const loginParams = loginHint ? { authConnection: loginHint } : undefined;
      provider = await instance.connectTo(sdk.WALLET_CONNECTORS.AUTH, loginParams);
    }

    if (!provider) return null;

    const keys = await deriveNearKeys(provider as { request: (args: { method: string }) => Promise<unknown> }, sdk);
    let info: { email?: string; name?: string } = {};
    try {
      info = await instance.getUserInfo();
    } catch { /* some providers don't return info */ }

    setAccountId(keys.accountId);
    setPublicKey(keys.publicKey);
    setEd25519SecretKey(keys.secretKey);
    setUserInfo({ email: info.email, name: info.name });
    setIsConnected(true);

    return keys;
  }, [ensureInit, deriveNearKeys]);

  const disconnect = useCallback(async () => {
    try {
      await web3authRef.current?.logout();
    } catch { /* already logged out */ }
    setAccountId(null);
    setPublicKey(null);
    setEd25519SecretKey(null);
    setUserInfo(null);
    setIsConnected(false);
  }, []);

  return (
    <Web3AuthContext.Provider
      value={{
        isInitialized,
        isConnected,
        accountId,
        publicKey,
        ed25519SecretKey,
        userInfo,
        connect,
        disconnect,
      }}
    >
      {children}
    </Web3AuthContext.Provider>
  );
}

export function useWeb3Auth() {
  return useContext(Web3AuthContext);
}
