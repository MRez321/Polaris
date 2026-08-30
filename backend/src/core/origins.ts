import dotenv from 'dotenv';

dotenv.config();

/**
 * Single source of truth for every origin trust list in the app:
 * Express CORS, better-auth `trustedOrigins`, and the socket.io gate.
 * Previously triplicated (app.ts / config/auth.ts / socketService.ts) with
 * a "keep in sync" comment — now impossible to drift.
 */

// Vite auto-increments the dev port when 5173 is taken (5174, 5175, …),
// so the whole local dev range is trusted, not one pinned port.
export const LOCAL_DEV_PORTS = [5173, 5174, 5175, 3000, 3001];

export const localDevOrigins: string[] = ['localhost', '127.0.0.1'].flatMap((host) =>
    LOCAL_DEV_PORTS.map((port) => `http://${host}:${port}`),
);

const LOCAL_DEV_ORIGIN_SET: Record<string, true> = Object.fromEntries(
    localDevOrigins.map((o) => [o, true] as [string, true]),
);

export function isLocalDevOrigin(origin: string): boolean {
    return LOCAL_DEV_ORIGIN_SET[origin] === true;
}

/** Production domains (no env needed) + env-configured origins. */
export const trustedOrigins: string[] = [
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
    process.env.BETTER_AUTH_URL,
    'http://localhost:3016', // backend itself
    'http://127.0.0.1:3016',
    'https://polarisstyle.ir',
    'http://polarisstyle.ir',
    'https://www.polarisstyle.ir',
    ...localDevOrigins,
].filter((o): o is string => Boolean(o));
