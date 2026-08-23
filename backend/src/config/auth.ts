import { betterAuth } from 'better-auth';
import { admin, bearer } from 'better-auth/plugins';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import dotenv from 'dotenv';

import { db } from './drizzle.js';
import * as schema from '../schema/index.js';

dotenv.config();

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3016',
    trustedOrigins: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        process.env.BETTER_AUTH_URL || 'http://localhost:3016',
    ],
    database: drizzleAdapter(db, {
        provider: 'mysql',
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
        },
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? {
                  google: {
                      clientId: process.env.GOOGLE_CLIENT_ID,
                      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                  },
              }
            : {}),
        ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
            ? {
                  github: {
                      clientId: process.env.GITHUB_CLIENT_ID,
                      clientSecret: process.env.GITHUB_CLIENT_SECRET,
                  },
              }
            : {}),
    },
    plugins: [
        admin({
            defaultRole: 'staff',
            adminRoles: ['admin'],
        }),
        bearer(),
    ],
});

export type Auth = typeof auth;
