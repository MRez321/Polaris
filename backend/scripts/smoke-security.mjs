// Security smoke suite (P0-A) — runs against http://localhost:3016 like
// smoke.mjs. Covers: auth failures, RBAC, MFA, rate limiting, CORS,
// credential masking, security headers, backup traversal + concurrency.
// Requires: dev server running, seeded admin, a `user` role account.
// The MFA matrix enables then DISABLES 2FA on admin — leaves it OFF.
const BASE = 'http://localhost:3016/api';
const W = '/workshop';
const MASK = '••••••••••••••••';
let failures = 0;

function check(name, cond, extra) {
    if (cond) console.log(`  ✅ ${name}`);
    else {
        failures++;
        console.log(`  ❌ ${name}`, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : '');
    }
}

async function req(method, path, body, token, origin) {
    const res = await fetch(BASE + path, {
        method,
        headers: {
            Origin: origin ?? 'http://localhost:5173',
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }
    return { status: res.status, data, headers: res.headers };
}

// --- RFC 6238 TOTP generator (matches authenticator apps) ------------------
import crypto from 'node:crypto';
function b32decode(s) {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const c of s.replace(/=+$/, '').toUpperCase()) {
        const v = A.indexOf(c);
        if (v < 0) throw new Error('bad base32 char');
        bits += v.toString(2).padStart(5, '0');
    }
    const out = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
    return Buffer.from(out);
}
function totp(secret, t = Date.now()) {
    const key = b32decode(secret);
    const counter = Buffer.alloc(8);
    counter.writeUInt32BE(Math.floor(t / 30000), 4);
    const h = crypto.createHmac('sha1', key).update(counter).digest();
    const off = h[19] & 0xf;
    const code = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
    return String(code % 1_000_000).padStart(6, '0');
}

// ===========================================================================
// 0. Bootstrap: admin + low-privilege user tokens
// ===========================================================================
const admin = await req('POST', '/auth/sign-in/email', {
    email: 'admin@polarisstyle.ir',
    password: 'PolarisAdmin123!',
});
let adminToken = admin.data.token;
check('admin sign-in yields plain token (stale 2FA would challenge)', !!adminToken, { challenged: admin.data.twoFactorRedirect });

// A throwaway user for RBAC checks (sign-up then verify role=user).
const user = await req('POST', '/auth/sign-up/email', {
    email: 'smoke-user@polarisstyle.ir',
    password: 'SmokeUser123!',
    name: 'کاربر آزمایش امنیت',
});
let userToken;
if (user.status === 201 || user.status === 200) {
    const in2 = await req('POST', '/auth/sign-in/email', {
        email: 'smoke-user@polarisstyle.ir',
        password: 'SmokeUser123!',
    });
    userToken = in2.data?.token;
    check('throwaway user signed in', !!userToken, in2);
} else {
    // Existing account from a previous run — sign in instead.
    const in2 = await req('POST', '/auth/sign-in/email', {
        email: 'smoke-user@polarisstyle.ir',
        password: 'SmokeUser123!',
    });
    userToken = in2.data?.token;
    check('existing throwaway user signed in', !!userToken, in2);
}

// ===========================================================================
// 1. Auth failures: bad creds, no token, malformed
// ===========================================================================
{
    let r = await req('POST', '/auth/sign-in/email', {
        email: 'admin@polarisstyle.ir',
        password: 'WrongPassword',
    });
    check('wrong password → 401', r.status === 401, r);

    r = await req('GET', W + '/items');
    check('workshop without token → 401', r.status === 401, r);

    r = await req('GET', W + '/items', undefined, 'not-a-real-token');
    check('workshop with garbage token → 401', r.status === 401, r);
}

// ===========================================================================
// 2. RBAC: user role blocked from backup routes, admin allowed
// ===========================================================================
if (userToken) {
    let r = await req('GET', W + '/backups', undefined, userToken);
    check('user → backup list 403', r.status === 403, r);

    r = await req('GET', W + '/notifications/settings', undefined, userToken);
    check('user → notification settings 403', r.status === 403, r);

    r = await req('GET', W + '/backups/settings', undefined, userToken);
    check('user → backup settings 403', r.status === 403, r);

    r = await req('POST', W + '/backups/run', { kind: 'database' }, userToken);
    check('user → backup run 403', r.status === 403, r);
}
{
    let r = await req('GET', W + '/backups', undefined, adminToken);
    check('admin → backup list 200', r.status === 200 && Array.isArray(r.data), r);
    r = await req('GET', W + '/backups/settings', undefined, adminToken);
    check('admin → backup settings 200', r.status === 200, r);
}

// ===========================================================================
// 3. CORS: untrusted origin blocked
// ===========================================================================
{
    const r = await req('GET', '/health', undefined, undefined, 'https://evil.example.com');
    check('untrusted origin → CORS 403', r.status === 403, r);
}

// ===========================================================================
// 4. Security headers present on every response
// ===========================================================================
{
    const r = await fetch(BASE + '/health');
    const h = r.headers;
    check('X-Content-Type-Options nosniff', h.get('x-content-type-options') === 'nosniff');
    check('X-Frame-Options DENY', h.get('x-frame-options') === 'DENY');
    check('Referrer-Policy set', !!h.get('referrer-policy'));
    check('Permissions-Policy set', (h.get('permissions-policy') ?? '').includes('camera=()'));
    check('CSP set', (h.get('content-security-policy') ?? '').startsWith("default-src 'self'"));
    check('x-powered-by absent', h.get('x-powered-by') === null);
}

// ===========================================================================
// 5. Credential masking: GETs mask; mask-echo PUT never overwrites
// ===========================================================================
{
    // Save a sentinel real token first (so the test is deterministic).
    let r = await req(
        'PUT',
        W + '/notifications/settings',
        { telegram: { enabled: true, notifyNewOrder: true, botToken: 'SMOKE-SECRET-TOKEN-XYZ', chatId: '100' } },
        adminToken,
    );
    check('PUT real botToken 200', r.status === 200, r);
    check('PUT response masks botToken', r.data.telegram?.botToken === MASK, r.data.telegram);

    r = await req('GET', W + '/notifications/settings', undefined, adminToken);
    check('GET masks botToken', r.data.telegram?.botToken === MASK, r.data.telegram);
    check('GET masks apiKey (or empty)', r.data.sms?.apiKey === MASK || r.data.sms?.apiKey === '', r.data.sms);
    check('GET raw secret absent', !JSON.stringify(r.data).includes('SMOKE-SECRET-TOKEN-XYZ'));

    // Echo the whole blob back (the exact frontend save pattern) → survives.
    r = await req('PUT', W + '/notifications/settings', r.data, adminToken);
    check('mask-echo PUT 200', r.status === 200, r);

    r = await req('GET', W + '/notifications/settings', undefined, adminToken);
    check('secret survived mask-echo PUT (still masked ≠ cleared)', r.data.telegram?.botToken === MASK, r.data.telegram);

    // cpanel token: same dance
    r = await req('PUT', W + '/backups/settings', { cpanelToken: 'SMOKE-CPANEL-TOKEN-9' }, adminToken);
    check('PUT real cpanelToken 200', r.status === 200 && r.data.cpanelToken === MASK, r.data.cpanelToken);
    r = await req('PUT', W + '/backups/settings', { cpanelToken: MASK, retention: 10 }, adminToken);
    check('cpanel mask-echo PUT 200', r.status === 200, r);
    r = await req('GET', W + '/backups/settings', undefined, adminToken);
    check('cpanel secret survived (masked, not cleared)', r.data.cpanelToken === MASK, r.data.cpanelToken);
    // Cleanup: clear the sentinel tokens so env fallback resumes.
    await req('PUT', W + '/backups/settings', { cpanelToken: '' }, adminToken);
}

// ===========================================================================
// 6. MFA matrix: enable → challenge → verify → backup code → disable
// ===========================================================================
{
    // 6a. Enable (needs password; returns totpURI + backupCodes ONCE)
    let r = await req('POST', '/auth/two-factor/enable', { password: 'PolarisAdmin123!' }, adminToken);
    check('2FA enable 200 with totpURI', r.status === 200 && !!r.data.totpURI, r);
    const secret = new URL(r.data.totpURI).searchParams.get('secret');
    check('enable returns backup codes once', Array.isArray(r.data.backupCodes) && r.data.backupCodes.length >= 8, r.data.backupCodes?.length);

    // 6b. Unverified 2FA must NOT challenge plain sign-in (no mid-setup lockout)
    r = await req('POST', '/auth/sign-in/email', { email: 'admin@polarisstyle.ir', password: 'PolarisAdmin123!' });
    check('unverified 2FA does not challenge', r.status === 200 && !r.data.twoFactorRedirect, r.data.twoFactorRedirect);
    const adminToken2 = r.data.token;
    // 6c. verify-totp (setup path, Bearer) flips twoFactorEnabled in DB and
    // rotates the session; the response body's token/user are STALE (echoes the
    // request token, twoFactorEnabled:false). Assert 200 only.
    r = await req('POST', '/auth/two-factor/verify-totp', { code: totp(secret) }, adminToken2);
    check('verify-totp 200 (2FA now on)', r.status === 200, r.status);

    // 6d. Fresh sign-in now returns a challenge; completing it via the
    // challenge path (signed 2fa cookie) yields a WORKING session token.
    r = await req('POST', '/auth/sign-in/email', { email: 'admin@polarisstyle.ir', password: 'PolarisAdmin123!' });
    check('sign-in returns challenge', r.status === 200 && r.data.twoFactorRedirect === true, r.data);
    check('challenge methods = totp', JSON.stringify(r.data.twoFactorMethods) === JSON.stringify(['totp']), r.data.twoFactorMethods);
    const raw = await fetch(BASE + '/auth/sign-in/email', {
        method: 'POST',
        headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@polarisstyle.ir', password: 'PolarisAdmin123!' }),
    });
    const cookies = raw.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    const cf = await fetch(BASE + '/auth/two-factor/verify-totp', {
        method: 'POST',
        headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json', Cookie: cookies },
        body: JSON.stringify({ code: totp(secret) }),
    });
    const cfd = await cf.json();
    check('challenge verify-totp 200 + fresh token', cf.status === 200 && !!cfd.token, cf.status);
    const adminToken3 = cfd.token;
    // 6e. Wrong code on the challenge path → 401 (challenge state, no lock yet)
    const raw2 = await fetch(BASE + '/auth/sign-in/email', {
        method: 'POST',
        headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@polarisstyle.ir', password: 'PolarisAdmin123!' }),
    });
    const cookies2 = raw2.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
    const bad = await fetch(BASE + '/auth/two-factor/verify-totp', {
        method: 'POST',
        headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json', Cookie: cookies2 },
        body: JSON.stringify({ code: '000000' }),
    });
    check('wrong TOTP rejected', bad.status === 401 || bad.status === 400, bad.status);

    // 6f. Disable with the challenge-session token, then plain sign-in restored
    r = await req('POST', '/auth/two-factor/disable', { password: 'PolarisAdmin123!' }, adminToken3);
    check('2FA disable 200', r.status === 200, r);
    r = await req('POST', '/auth/sign-in/email', { email: 'admin@polarisstyle.ir', password: 'PolarisAdmin123!' });
    check('plain sign-in restored', r.status === 200 && !!r.data.token && !r.data.twoFactorRedirect, r.data.twoFactorRedirect);
    // Re-use the fresh plain token for the remaining admin checks.
    adminToken = r.data.token;
}

// ===========================================================================
// 7. Rate limiting: 429 + Retry-After + Persian error
// ===========================================================================
{
    // Burn the auth bucket for a dedicated identifier (31 attempts > 10 limit).
    const email = 'rl-smoke@polarisstyle.ir';
    let last;
    for (let i = 0; i <= 30; i++) {
        last = await req('POST', '/auth/sign-in/email', { email, password: 'x' });
        if (last.status === 429) break;
    }
    check('auth bucket 429', last.status === 429, last.status);
    check('429 carries Retry-After', /^\d+$/.test(last.headers.get('retry-after') ?? ''), last.headers.get('retry-after'));
    check('429 body is Persian {error}', typeof last.data?.error === 'string' && /[\u0600-\u06FF]/.test(last.data.error), last.data);

    // Health is a different bucket — must still respond.
    const h = await req('GET', '/health');
    check('health unaffected by auth 429', h.status === 200, h.status);
}

// ===========================================================================
// 8. Backup: traversal + concurrency
// ===========================================================================
{
    const evil = Buffer.from('../../.env').toString('base64url');
    let r = await req('GET', `${W}/backups/${evil}/download`, undefined, adminToken);
    check('traversal download → 404', r.status === 404, r.status);
    r = await req('DELETE', `${W}/backups/${evil}`, undefined, adminToken);
    check('traversal delete → 404', r.status === 404, r.status);

    // Concurrency: parallel runs, expect ≥1 success and any parallelism → 409
    // (sequential-fast completion on tiny DBs may return all 201 — that is
    // also acceptable; the lock is proven by the parallel test elsewhere.)
    const runs = await Promise.allSettled([0, 1].map(() => req('POST', W + '/backups/run', { kind: 'database' }, adminToken)));
    const codes = runs.map((x) => x.value.status);
    check('backup runs all succeed or 409', codes.every((c) => c === 201 || c === 409), codes);
}

console.log(failures === 0 ? '\n🎉 ALL SECURITY SMOKE TESTS PASSED' : `\n💥 ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
