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
import { IS_PRODUCTION, assertStrongAuthSecret } from '../../core/security/env.js';
import { sanitizeMessage } from '../../core/utils/sanitize.js';

dotenv.config();

// P0-A-05: BETTER_AUTH_SECRET must exist and be strong. In production a weak/
// missing secret is a hard boot failure (see core/security/env.ts); in dev we
// still refuse to run cookie-signing on a placeholder.
assertStrongAuthSecret();

const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7; // 7 days — explicit, reasonable.

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3016',
    // Single source of truth: src/core/origins.ts (shared with Express CORS
    // and socket.io). better-auth's CSRF gate and CORS can no longer drift.
    trustedOrigins,
    session: {
        // P0-A-05: explicit lifetime; cookie never readable by JS.
        expiresIn: SESSION_LIFETIME_SECONDS,
        updateAge: 60 * 60 * 24, // refresh daily while in use
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60, // 5-min performance cache; still server-validated on writes
        },
    },
    advanced: {
        // P0-A-05/P0-A-08: auth cookies are HttpOnly + SameSite=Lax at minimum,
        // and Secure whenever the deployment is HTTPS (production / any https
        // base URL). The 2FA challenge cookie follows the same policy.
        useSecureCookies: IS_PRODUCTION || /^https:\/\//.test(process.env.BETTER_AUTH_URL ?? ''),
        cookies: {},
    },
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
        // P0-A-05: password policy enforced through better-auth (min 8 chars,
        // the existing UX copy promises the same).
        minPasswordLength: 8,
        maxPasswordLength: 128,
    },
    // Link a social sign-in to the existing credential user when the emails
    // match, so both methods point to a single unique user. The app has no
    // e-mail verification flow (credential users are emailVerified=false),
    // and Google proves ownership of the e-mail address, so requiring a
    // verified local e-mail would make linking impossible for no gain.
    // P0-A-05: automatic linking is limited to providers that cryptographically
    // prove the email (Google/GitHub). GitHub's email is provider-verified.
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ['google', 'github'],
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
                        console.error('⚠️ Failed to write login audit log:', sanitizeMessage(err instanceof Error ? err.message : err));
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
        // P0-A-06: TOTP + backup codes. Secrets live in the twoFactor table
        // (encrypted with the auth secret); raw secrets/backup codes are only
        // returned once at enable-time, never logged, never re-served.
        twoFactor({
            issuer: 'Polaris',
            // Repeated failed verifications lock the account-level flow:
            // better-auth caps consecutive failures and locks for 15 minutes.
            accountLockout: {
                enabled: true,
                maxFailedAttempts: 10,
                durationSeconds: 900,
            },
        }),
    ],
});

export type Auth = typeof auth;
