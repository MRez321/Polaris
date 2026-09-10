/**
 * Polaris — Telegram Bot API relay for Cloudflare Workers.
 *
 * Telegram API is blocked in Iran. This Worker acts as a transparent reverse
 * relay: every request that reaches the Worker is forwarded to
 * https://api.telegram.org with the same path, query, method, headers and
 * body, and the upstream response is streamed back unchanged. The Polaris
 * backend then only needs the Worker URL instead of a CONNECT proxy.
 *
 * Deploy (see docs/telegram-relay-guide.md for the full Persian walkthrough):
 *   1. dash.cloudflare.com → Workers & Pages → Create Worker → paste this file
 *      (or: npx wrangler deploy telegram-proxy-worker.js)
 *   2. Copy the https://<name>.<subdomain>.workers.dev URL
 *   3. Paste it into تنظیمات → اطلاع‌رسانی → «آدرس ریلای کلادفلر»
 *
 * Cache policy: getMe is cached for a day, bot file downloads for a year,
 * regular bot calls for 30s — mirrors what the public community relays do.
 */

const API_HOST = 'api.telegram.org';

// Response headers for CORS + passthrough. Bots are cross-origin by nature.
const baseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: baseHeaders });
  }

  const inUrl = new URL(request.url);
  const upstream = new URL(request.url);
  upstream.hostname = API_HOST;
  // Keep protocol/port of the Worker edge (https/443) — api.telegram.org is https.

  const upstreamRequest = new Request(upstream.toString(), {
    method: request.method,
    headers: cleanHeaders(request.headers),
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });

  const cacheKey = buildCacheKey(upstream, request);

  // Serve from cache when possible (cache API only exists in production).
  if (request.method === 'GET' && caches.default) {
    const cached = await caches.default.match(cacheKey);
    if (cached) return cached;
  }

  const response = await fetch(upstreamRequest);

  // Telegram occasionally answers 304 with no CORS headers; rebuild safely.
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(baseHeaders)) {
    headers.set(key, value);
  }

  const out = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  if (request.method === 'GET' && caches.default) {
    const ttl = cacheTtlSeconds(inUrl.pathname);
    if (ttl > 0) {
      headers.set('Cache-Control', `public, max-age=${ttl}`);
      const cacheable = new Response(out.body, out);
      event-safePut(caches.default, cacheKey, cacheable, ttl);
    }
  }

  return out;
}

/** Strips Worker/Cloudflare-injected headers before hitting the Telegram API. */
function cleanHeaders(headers) {
  const clean = new Headers();
  for (const [key, value] of headers.entries()) {
    const k = key.toLowerCase();
    if (k === 'host' || k === 'cf-connecting-ip' || k.startsWith('cf-') || k === 'x-forwarded-for') {
      continue;
    }
    clean.set(key, value);
  }
  return clean;
}

/** Cache key = upstream URL + method, so query strings stay distinct. */
function buildCacheKey(upstream, request) {
  const key = new Request(upstream.toString(), { method: 'GET' });
  return key;
}

function cacheTtlSeconds(pathname) {
  if (pathname.endsWith('/getMe')) return 86400; // 1 day
  if (pathname.includes('/file/bot')) return 31536000; // 1 year — immutable files
  if (pathname.includes('/bot')) return 30; // regular bot API calls
  return 0; // no caching for anything else
}

/** cache.put is async and must not block the response — fire and forget. */
function event-safePut(cache, key, value, _ttl) {
  cache.put(key, value).catch(() => {
    /* cache failures are non-fatal */
  });
}
