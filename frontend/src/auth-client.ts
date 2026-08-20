import { createAuthClient } from 'better-auth/react';

export const { signIn, signUp, signOut, useSession, getSession } = createAuthClient({
    baseURL: 'http://localhost:3016/api/auth',
});
