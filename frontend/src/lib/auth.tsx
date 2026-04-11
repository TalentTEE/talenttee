'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from './types';
import { getDummyUser } from './api';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
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

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('jwt');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
