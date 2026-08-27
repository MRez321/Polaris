import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { authClient } from '@/lib/auth';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (name: string, email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, isPending } = authClient.useSession();

  const user = useMemo<AuthUser | null>(() => {
    if (!data?.user) return null;
    return {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role || 'staff',
    };
  }, [data]);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await authClient.signIn.email({ email, password });
    return error?.message ?? null;
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string): Promise<string | null> => {
    const { error } = await authClient.signUp.email({ name, email, password });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await authClient.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin: user?.role === 'admin',
      isLoading: isPending,
      signIn,
      signUp,
      signOut,
    }),
    [user, isPending, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
