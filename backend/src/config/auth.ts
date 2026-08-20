import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './drizzle.js';
import * as schema from '../schema/auth.js';

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: 'mysql',
        schema: schema,
    }),

    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },

    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        },
    },

    // --- ADD THIS SECTION ---
    trustedOrigins: [
        "http://localhost:5173",
        "http://localhost:3016",
        "https://polarisstyle.ir",
        "https://api.polarisstyle.ir",

        // Add your production domain here later
    ],
    // ------------------------

    advanced: {
        defaultCookieAttributes: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'lax',
        },
    },
});

export type Session = typeof auth.$Infer.Session;