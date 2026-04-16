'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, UserRole } from './types';
import { getDummyUser, requestChallenge, verifyNearAuth, devLogin as devLoginApi } from './api';
import { useWallet } from './wallet-selector';

const ACCOUNTS_KEY = 'registeredAccounts';

/** Read the account→role registry from localStorage */
function getAccountRegistry(): Record<string, UserRole> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Save an account→role mapping */
function saveAccountRole(accountId: string, role: UserRole) {
  const reg = getAccountRegistry();
  reg[accountId] = role;
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(reg));
}

interface AuthContextType {
  user: User | null;
  /** Signup: choose role + create account */
  signup: (nearAccountId: string, role: UserRole) => Promise<void>;
  /** Login: account only, role looked up from registration */
  loginByAccount: (nearAccountId: string) => Promise<void>;
  /** Legacy dummy login */
  login: (role: UserRole) => Promise<void>;
  loginWithNear: (nearAccountId: string, role: UserRole) => Promise<void>;
  /** Dev-only login bypass — no wallet required */
  devLogin: (nearAccountId: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  signup: async () => {},
  loginByAccount: async () => {},
  login: async () => {},
  loginWithNear: async () => {},
  devLogin: async () => {},
  logout: () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { selector } = useWallet();

  // Pre-fetch challenge nonce so wallet.signMessage() can fire immediately
  // from user gesture without an async HTTP call breaking the popup chain.
  const nonceRef = useRef<string | null>(null);
  const fetchingRef = useRef(false);

  const prefetchChallenge = () => {
    if (process.env.NEXT_PUBLIC_USE_DUMMY === 'true' || fetchingRef.current) return;
    fetchingRef.current = true;
    requestChallenge()
      .then(({ nonce }) => { nonceRef.current = nonce; })
      .catch(() => { /* will fetch on-demand as fallback */ })
      .finally(() => { fetchingRef.current = false; });
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const jwt = localStorage.getItem('jwt');
    if (stored && jwt) {
      // Check if JWT is expired by decoding the payload
      try {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          // JWT expired — clear stale session
          localStorage.removeItem('user');
          localStorage.removeItem('jwt');
        } else {
          setUser(JSON.parse(stored));
        }
      } catch {
        // Malformed JWT — clear it
        localStorage.removeItem('user');
        localStorage.removeItem('jwt');
      }
    } else if (stored && !jwt) {
      // User without JWT — clear stale data
      localStorage.removeItem('user');
    }
    setIsLoading(false);
    prefetchChallenge();
  }, []);

  const NOT_REGISTERED_MESSAGE = 'Account not registered. Please sign up first.';

  const doLogin = async (
    nearAccountId: string,
    intent: 'login' | 'signup',
    role?: UserRole,
  ) => {
    const useDummy = process.env.NEXT_PUBLIC_USE_DUMMY === 'true';
    if (useDummy) {
      // Dummy mode bypasses the backend, but must NOT silently default to SEEKER.
      // For login intent without a registry entry, throw the same error as prod
      // so the bug cannot be reintroduced in demos.
      let effectiveRole = role;
      if (!effectiveRole) {
        const registry = getAccountRegistry();
        effectiveRole = registry[nearAccountId];
      }
      if (!effectiveRole) {
        throw new Error(NOT_REGISTERED_MESSAGE);
      }
      const dummyUser = await getDummyUser(effectiveRole, nearAccountId);
      const userData = { ...dummyUser, nearAccountId };
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('jwt', 'dummy-jwt-token');
      setUser(userData);
      return;
    }

    // Always fetch a fresh nonce to avoid expiry issues (pre-fetched nonce
    // from page load may be >5 min old if the user took time connecting wallet).
    const { nonce } = await requestChallenge();
    nonceRef.current = null;

    // Use Wallet Selector signMessage (NEP-413)
    if (!selector) throw new Error('Wallet not initialized');
    const wallet = await selector.wallet();
    if (!wallet.signMessage) {
      throw new Error('This wallet does not support message signing (NEP-413). Please use a compatible wallet.');
    }

    const nonceBuffer = Buffer.from(nonce, 'hex');
    const signed = await wallet.signMessage({
      message: nonce,
      recipient: 'talent-tee',
      nonce: nonceBuffer,
    });
    if (!signed) throw new Error('Signing cancelled');

    const signature = typeof signed.signature === 'string'
      ? signed.signature
      : Buffer.from(signed.signature).toString('base64');
    const publicKey = signed.publicKey;

    // Only include role when the caller provided one (signup path).
    // Login intent must NEVER send a role — backend is the source of truth.
    const verifyPayload: Parameters<typeof verifyNearAuth>[0] = {
      nearAccountId,
      publicKey,
      signature,
      nonce,
      intent,
    };
    if (role !== undefined) {
      verifyPayload.role = role;
    }

    let response: Awaited<ReturnType<typeof verifyNearAuth>>;
    try {
      response = await verifyNearAuth(verifyPayload);
    } catch (e) {
      // Normalize backend "not registered" 404 into a stable, user-facing error.
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('not registered')) {
        throw new Error(NOT_REGISTERED_MESSAGE);
      }
      throw e;
    }

    const { jwt, user: apiUser } = response;
    const userData: User = {
      id: apiUser.id,
      nearAccountId: apiUser.nearAccountId,
      role: apiUser.role as UserRole,
      publicKey: apiUser.publicKey,
      createdAt: apiUser.createdAt,
    };
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('jwt', jwt);
    setUser(userData);

    // Pre-fetch next nonce for subsequent logins
    prefetchChallenge();
  };

  /** Signup: register role + log in */
  const signup = async (nearAccountId: string, role: UserRole) => {
    saveAccountRole(nearAccountId, role);
    await doLogin(nearAccountId, 'signup', role);
  };

  /** Login by account ID — backend is authoritative for role. Never sends a role. */
  const loginByAccount = async (nearAccountId: string) => {
    await doLogin(nearAccountId, 'login');
    // After successful login, cache the role returned by the backend for this browser.
    const stored = localStorage.getItem('user');
    if (stored) {
      const userData = JSON.parse(stored);
      if (userData.role) {
        saveAccountRole(nearAccountId, userData.role);
      }
    }
  };

  /** Legacy: dummy login by role — treat as signup since role is explicit */
  const login = async (role: UserRole) => {
    const accountId = role === 'SEEKER' ? 'alice.testnet' : 'bob.testnet';
    saveAccountRole(accountId, role);
    await doLogin(accountId, 'signup', role);
  };

  /** Legacy: login with explicit NEAR account + role — treat as signup since role is explicit */
  const loginWithNear = async (nearAccountId: string, role: UserRole) => {
    saveAccountRole(nearAccountId, role);
    await doLogin(nearAccountId, 'signup', role);
  };

  /** Dev-only login: calls backend dev-login endpoint, no wallet needed */
  const devLogin = async (nearAccountId: string, role: UserRole) => {
    const { jwt, user: apiUser } = await devLoginApi({ nearAccountId, role });
    const userData: User = {
      id: apiUser.id,
      nearAccountId: apiUser.nearAccountId,
      role: apiUser.role as UserRole,
      publicKey: apiUser.publicKey,
      createdAt: apiUser.createdAt,
    };
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('jwt', jwt);
    saveAccountRole(nearAccountId, role);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('jwt');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signup, loginByAccount, login, loginWithNear, devLogin, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
