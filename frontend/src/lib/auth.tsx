'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
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
      const { nonce } = await requestChallenge();

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
    }
  };

  /** Signup: register role + log in */
  const signup = async (nearAccountId: string, role: UserRole) => {
    saveAccountRole(nearAccountId, role);
    await doLogin(nearAccountId, role);
  };

  /** Login by account ID — looks up stored role */
  const loginByAccount = async (nearAccountId: string) => {
    const registry = getAccountRegistry();
    const role = registry[nearAccountId];
    if (!role) {
      throw new Error('Account not found. Please sign up first.');
    }
    await doLogin(nearAccountId, role);
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
