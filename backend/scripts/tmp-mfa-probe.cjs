// Empirical MFA flow probe: enable → verify-totp → sign-in challenge →
// challenge verify → backup-code → disable. Cookie-jar based (session
// rotation on enable/disable invalidates bearer tokens).
const http = require('http');
const crypto = require('crypto');

const B = 'http://localhost:3016';
const ORIGIN = 'http://localhost:5173';
const EMAIL = 'admin@polarisstyle.ir';
const PASSWORD = 'PolarisAdmin123!';

let jar = new Map();
function cookieHeader() {
    return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}
function storeCookies(setCookies) {
    if (!setCookies) return;
    (Array.isArray(setCookies) ? setCookies : [setCookies]).forEach((raw) => {
        const [pair] = raw.split(';');
        const eq = pair.indexOf('=');
        const name = pair.slice(0, eq).trim();
        if (raw.includes('Max-Age=0') || raw.includes('Expires=Thu, 01 Jan 1970')) jar.delete(name);
        else jar.set(name, pair.slice(eq + 1).trim());
    });
}

function req(method, path, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const url = new URL(path, B);
        const r = http.request({ hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers: {
            'Content-Type': 'application/json',
            Origin: ORIGIN,
            Cookie: cookieHeader(),
            ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        } }, (res) => {
            let buf = '';
            res.on('data', (c) => buf += c);
            res.on('end', () => {
                storeCookies(res.headers['set-cookie']);
                let json = null;
                try { json = JSON.parse(buf); } catch { /* not json */ }
                resolve({ status: res.statusCode, headers: res.headers, body: buf, json });
            });
        });
        r.on('error', reject);
        if (data) r.write(data);
        r.end();
    });
}

// --- RFC 6238 TOTP (SHA1, 6 digits, 30s) -----------------------------------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Decode(s) {
    let bits = '';
    for (const ch of s.replace(/=+$/, '').toUpperCase()) {
        const v = B32.indexOf(ch);
        if (v < 0) throw new Error(`bad base32 char ${ch}`);
        bits += v.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
    return Buffer.from(bytes);
}
function totp(secretB32, t = Math.floor(Date.now() / 1000 / 30)) {
    const key = base32Decode(secretB32);
    const msg = Buffer.alloc(8);
    msg.writeUInt32BE(Math.floor(t / 2 ** 32), 0);
    msg.writeUInt32BE(t % 2 ** 32, 4);
    const hmac = crypto.createHmac('sha1', key).update(msg).digest();
    const off = hmac[hmac.length - 1] & 0x0f;
    const code = (((hmac[off] & 0x7f) << 24) | (hmac[off + 1] << 16) | (hmac[off + 2] << 8) | hmac[off + 3]) % 1e6;
    return String(code).padStart(6, '0');
}

(async () => {
    // 1. Sign in
    const signin = await req('POST', '/api/auth/sign-in/email', { email: EMAIL, password: PASSWORD });
    console.log('1. signin:', signin.status, 'cookie names:', [...jar.keys()].join(','));

    // 2. Enable 2FA
    const enable = await req('POST', '/api/auth/two-factor/enable', { password: PASSWORD });
    if (enable.status !== 200) { console.error('2. enable FAILED:', enable.status, enable.body); process.exit(1); }
    const { totpURI, backupCodes } = enable.json;
    const secret = new URLSearchParams(new URL(totpURI).query).get('secret');
    console.log('2. enable ok; secret len:', secret.length, 'backup codes:', backupCodes.length, 'sample:', backupCodes[0]);

    // 3. Verify TOTP (enable completion) — session rotates here
    const v1 = await req('POST', '/api/auth/two-factor/verify-totp', { code: totp(secret) });
    console.log('3. verify-totp (enable):', v1.status, v1.body.slice(0, 120));
    if (v1.status !== 200) { console.error('   FAILED'); process.exit(1); }

    // 4. New sign-in must now return the 2FA challenge
    const signin2 = await req('POST', '/api/auth/sign-in/email', { email: EMAIL, password: PASSWORD });
    console.log('4. signin with 2FA:', signin2.status, 'twoFactorRedirect:', signin2.json?.twoFactorRedirect, 'methods:', signin2.json?.twoFactorMethods);
    console.log('   cookies after challenge:', [...jar.keys()].join(','));
    const hasSession = [...jar.keys()].some((k) => k.includes('session_token'));
    console.log('   session cookie present (should be false):', hasSession);

    // 5. Challenge verify with fresh TOTP
    const v2 = await req('POST', '/api/auth/two-factor/verify-totp', { code: totp(secret) });
    console.log('5. verify-totp (challenge):', v2.status, 'has token:', !!v2.json?.token, 'user:', v2.json?.user?.email);
    console.log('   cookies after challenge-verify:', [...jar.keys()].join(','));

    // 6. Sign out, sign in again, try a backup code
    await req('POST', '/api/auth/sign-out');
    const signin3 = await req('POST', '/api/auth/sign-in/email', { email: EMAIL, password: PASSWORD });
    console.log('6. signin again → redirect:', signin3.json?.twoFactorRedirect);
    const usedCode = backupCodes[0];
    const v3 = await req('POST', '/api/auth/two-factor/verify-backup-code', { code: usedCode });
    console.log('   backup-code verify:', v3.status, 'has token:', !!v3.json?.token);

    // 7. Re-sign-in with second backup code — first one must be consumed
    await req('POST', '/api/auth/sign-out');
    const signin4 = await req('POST', '/api/auth/sign-in/email', { email: EMAIL, password: PASSWORD });
    const v4 = await req('POST', '/api/auth/two-factor/verify-backup-code', { code: usedCode });
    console.log('7. reuse consumed code:', v4.status, v4.body.slice(0, 100), '(expect 400-ish Invalid backup code)');

    // 8. Invalid TOTP x2 during challenge
    await req('POST', '/api/auth/sign-out');
    await req('POST', '/api/auth/sign-in/email', { email: EMAIL, password: PASSWORD });
    const i1 = await req('POST', '/api/auth/two-factor/verify-totp', { code: '000000' });
    console.log('8. invalid code #1:', i1.status, i1.body.slice(0, 90));
    const i2 = await req('POST', '/api/auth/two-factor/verify-totp', { code: '000001' });
    console.log('   invalid code #2:', i2.status, i2.body.slice(0, 90));

    // 9. Disable with wrong then right password (also clears any lockout)
    // First re-auth with valid TOTP (need session to disable)
    const v5 = await req('POST', '/api/auth/two-factor/verify-totp', { code: totp(secret) });
    console.log('9. re-auth via totp after invalids:', v5.status, 'has token:', !!v5.json?.token);
    const wrongPw = await req('POST', '/api/auth/two-factor/disable', { password: 'wrong-password' });
    console.log('   disable wrong pw:', wrongPw.status, wrongPw.body.slice(0, 90));
    const dis = await req('POST', '/api/auth/two-factor/disable', { password: PASSWORD });
    console.log('   disable ok:', dis.status, '→ twoFactorEnabled cleared');

    // 10. Final sign-in must be plain (no challenge)
    await req('POST', '/api/auth/sign-out');
    const final = await req('POST', '/api/auth/sign-in/email', { email: EMAIL, password: PASSWORD });
    console.log('10. plain signin restored:', final.status, 'redirect:', final.json?.redirect, 'twoFactorRedirect:', final.json?.twoFactorRedirect ?? '(absent)');
    process.exit(0);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
