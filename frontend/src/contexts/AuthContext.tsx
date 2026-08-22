import React, { createContext, useContext, useState, useEffect } from 'react';
import { signIn, signUp, signOut, useSession } from '../lib/auth-client';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    showLoginModal: boolean;
    setShowLoginModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { data: session, isPending } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // Convert session to user object
    const user = session?.user ? {
        id: session.user.id,
        name: session.user.name || '',
        email: session.user.email,
        role: session.user.role || 'user',
        image: session.user.image,
    } : null;

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            await signIn.email({ email, password });
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (name: string, email: string, password: string) => {
        setIsLoading(true);
        try {
            await signUp.email({ name, email, password });
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        try {
            await signOut();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            register,
            logout,
            showLoginModal,
            setShowLoginModal,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}