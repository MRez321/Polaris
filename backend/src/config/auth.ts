import { betterAuth } from 'better-auth';
import { admin, bearer } from 'better-auth/plugins';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

import { db } from './drizzle.js';
import * as schema from '../schema/index.js';
import { logAudit } from '../services/auditService.js';

dotenv.config();

// Vite auto-increments the dev port when 5173 is taken (5174, 5175, …).
// This is better-auth's own CSRF origin gate — separate from Express CORS —
// so the whole local dev range must be trusted here too, or every /api/auth
// request from a secondary dev port fails with INVALID_ORIGIN.
const localDevOrigins = ['localhost', '127.0.0.1'].flatMap((host) =>
    [5173, 5174, 5175, 3000, 3001].map((port) => `http://${host}:${port}`),
);

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3016',
    trustedOrigins: [
        process.env.CORS_ORIGIN,
        process.env.FRONTEND_URL,
        process.env.BETTER_AUTH_URL,
        'http://localhost:3016',
        'http://127.0.0.1:3016',
        ...localDevOrigins,
    ].filter((o): o is string => Boolean(o)),
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
    // Link a social sign-in to the existing credential user when the emails
    // match, so both methods point to a single unique user. The app has no
    // e-mail verification flow (credential users are emailVerified=false),
    // and Google proves ownership of the e-mail address, so requiring a
    // verified local e-mail would make linking impossible for no gain.
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ['google'],
            requireLocalEmailVerified: false,
        },
    },
    databaseHooks: {
        session: {
            create: {
                // Audit every new session (sign-in or sign-up). Failures are
                // swallowed so auditing can never break authentication.
                after: async (session) => {
                    try {
                        const rows = await db.select().from(schema.user).where(eq(schema.user.id, session.userId));
                        const u = rows[0];
                        if (u) {
                            logAudit(
                                { user: { id: u.id, name: u.name, role: u.role } },
                                'login',
                                'auth',
                                `ورود کاربر ${u.name} (${u.email})`,
                                typeof session.ipAddress === 'string' ? session.ipAddress : undefined,
                            );
                        }
                    } catch (err) {
                        console.error('⚠️ Failed to write login audit log:', err);
                    }
                },
            },
        },
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
            // Website customers sign up as plain users; workshop roles are
            // assigned explicitly by the admin in the users manager.
            defaultRole: 'user',
            adminRoles: ['admin'],
        }),
        bearer(),
    ],
});

export type Auth = typeof auth;
