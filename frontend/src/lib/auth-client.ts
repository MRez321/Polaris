import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
    // This MUST be your backend port (3016), not the frontend port (5173)
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3016',
});

export const { useSession, signIn, signOut } = authClient;