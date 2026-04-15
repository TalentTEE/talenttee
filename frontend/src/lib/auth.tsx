'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, UserRole } from './types';
import { getDummyUser, requestChallenge, verifyNearAuth } from './api';
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
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  signup: async () => {},
  loginByAccount: async () => {},
  login: async () => {},
  loginWithNear: async () => {},
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

  const doLogin = async (nearAccountId: string, role: UserRole) => {
    const useDummy = process.env.NEXT_PUBLIC_USE_DUMMY === 'true';
    if (useDummy) {
      const dummyUser = await getDummyUser(role, nearAccountId);
      const userData = { ...dummyUser, nearAccountId };
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('jwt', 'dummy-jwt-token');
      setUser(userData);
    } else {
      // Use pre-fetched nonce if available; fallback to on-demand fetch
      let nonce = nonceRef.current;
      if (!nonce) {
        const challenge = await requestChallenge();
        nonce = challenge.nonce;
      }
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

      const { jwt, user: apiUser } = await verifyNearAuth({
        nearAccountId,
        publicKey,
        signature,
        nonce,
        role,
      });

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
    }
  };

  /** Signup: register role + log in */
  const signup = async (nearAccountId: string, role: UserRole) => {
    saveAccountRole(nearAccountId, role);
    await doLogin(nearAccountId, role);
  };

  /** Login by account ID — looks up stored role, falls back to backend lookup */
  const loginByAccount = async (nearAccountId: string) => {
    const registry = getAccountRegistry();
    // Use stored role if available; otherwise fall back to SEEKER.
    // The backend's findOrCreateUser returns the real role for existing users,
    // so the fallback value only matters for truly new accounts.
    const role = registry[nearAccountId] || ('SEEKER' as UserRole);
    await doLogin(nearAccountId, role);
    // After successful login, persist the actual role from the backend response
    // so future logins on this browser don't need the fallback.
    const stored = localStorage.getItem('user');
    if (stored) {
      const userData = JSON.parse(stored);
      if (userData.role) {
        saveAccountRole(nearAccountId, userData.role);
      }
    }
  };

  /** Legacy: dummy login by role */
  const login = async (role: UserRole) => {
    const accountId = role === 'SEEKER' ? 'alice.testnet' : 'bob.testnet';
    saveAccountRole(accountId, role);
    await doLogin(accountId, role);
  };

  /** Legacy: login with explicit NEAR account + role */
  const loginWithNear = async (nearAccountId: string, role: UserRole) => {
    saveAccountRole(nearAccountId, role);
    await doLogin(nearAccountId, role);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('jwt');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signup, loginByAccount, login, loginWithNear, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
