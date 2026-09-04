import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { authClient } from '@/lib/auth';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (name: string, email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<string | null>;
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
      role: data.user.role || 'user',
      ...(data.user.image ? { image: data.user.image } : {}),
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

  // Redirects the browser to Google; better-auth's OAuth callback returns to
  // /api/auth/callback/google, sets the session cookie, then redirects to
  // callbackURL. Absolute URLs because the round-trip leaves the SPA origin.
  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    try {
      const { error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/login`,
        errorCallbackURL: `${window.location.origin}/login`,
      });
      return error?.message ?? null;
    } catch {
      return 'خطا در اتصال به سرور؛ اتصال اینترنت را بررسی کنید';
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin: user?.role === 'admin',
      isLoading: isPending,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
    }),
    [user, isPending, signIn, signUp, signOut, signInWithGoogle]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
