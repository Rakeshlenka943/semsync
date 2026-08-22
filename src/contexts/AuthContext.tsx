import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../types/database';
import { getCurrentUser, signIn, signOut, signUp, type SignUpData, type AuthCredentials } from '../services/auth.service';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (creds: AuthCredentials) => Promise<{ user: User | null; error: Error | null }>;
  register: (data: SignUpData) => Promise<{ user: User | null; error: Error | null }>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => { getCurrentUser().then(({ user }) => { setUser(user); setIsLoading(false); }); }, []);
  const login = async (creds: AuthCredentials) => { const result = await signIn(creds); if (result.user) setUser(result.user); return result; };
  const register = async (data: SignUpData) => { const result = await signUp(data); if (result.user) setUser(result.user); return result; };
  const logout = async () => { await signOut(); setUser(null); };
  return <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used within AuthProvider'); return ctx; };
