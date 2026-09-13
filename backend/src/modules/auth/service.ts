import { betterAuth } from 'better-auth';
import { admin, bearer, twoFactor } from 'better-auth/plugins';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

import { db } from '../../config/drizzle.js';
import * as schema from '../../schema/index.js';
import { logAudit } from '../../core/services/auditService.js';
import { recordWorkshopEvent } from '../workshop/services/notificationsService.js';
import { trustedOrigins } from '../../core/origins.js';
import { isProduction } from '../../config/env.js';

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3016',
    // Single source of truth: src/core/origins.ts (shared with Express CORS
    // and socket.io). better-auth's CSRF gate and CORS can no longer drift.
    trustedOrigins,
    database: drizzleAdapter(db, {
        provider: 'mysql',
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
            twoFactor: schema.twoFactor,
        },
    }),
    emailAndPassword: {
        enabled: true,
        // Reject weak passwords at the better-auth boundary (min length 8,
        // matching the frontend signup validation).
        minPasswordLength: 8,
    },
    // Built-in per-IP rate limiting for auth endpoints (better-auth applies
    // 3 requests / 10s window per IP on /sign-in, /sign-up and the
    // two-factor routes when enabled). NODE_ENV is unset in the cPanel
    // deployment, so enable explicitly rather than relying on the default.
    rateLimit: {
        enabled: true,
    },
    advanced: {
        // Secure/authenticated cookies over TLS. With NODE_ENV unset on
        // cPanel, better-auth's internal isProduction is false — force the
        // secure flag from our own deployment heuristic.
        useSecureCookies: isProduction(),
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
                            recordWorkshopEvent({
                                type: 'system',
                                title: 'ورود کاربر',
                                body: `کاربر ${u.name} (${u.email}) وارد سامانه شد`,
                                entityType: 'auth',
                                entityId: u.id,
                            });
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
        // TOTP + backup-code 2FA (Settings → امنیت). Explicit issuer so the
        // authenticator app label is stable regardless of appName fallback;
        // skipVerificationOnEnable stays false: enabling always ends with a
        // verified TOTP code. Built-in accountLockout defaults apply
        // (10 failed attempts / 15 min).
        twoFactor({
            issuer: 'Polaris Style',
        }),
    ],
});

export type Auth = typeof auth;
