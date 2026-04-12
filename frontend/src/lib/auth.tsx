'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from './types';
import { getDummyUser, requestChallenge, verifyNearAuth } from './api';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => Promise<void>;
  loginWithNear: (nearAccountId: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  loginWithNear: async () => {},
  logout: () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setIsLoading(false);
  }, []);

  const login = async (role: UserRole) => {
    const USE_DUMMY = process.env.NEXT_PUBLIC_USE_DUMMY === 'true';
    if (USE_DUMMY) {
      const dummyUser = await getDummyUser(role);
      localStorage.setItem('user', JSON.stringify(dummyUser));
      localStorage.setItem('jwt', 'dummy-jwt-token');
      setUser(dummyUser);
    }
    // TODO: Real NEAR wallet login (Day 3)
  };

  const loginWithNear = async (nearAccountId: string, role: UserRole) => {
    const { nonce } = await requestChallenge();

    // PoC: backend does not verify signature, so use placeholders
    const signature = 'poc-signature-placeholder';
    const publicKey = 'ed25519:placeholder';

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
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('jwt');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithNear, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
