#!/usr/bin/env node
/**
 * Phase-2 API smoke test (blog CMS, orders, role separation).
 * Requires the backend running on :3016. Run: node scripts/smoke-phase2.mjs
 */
const B = 'http://localhost:3016/api';
let pass = 0;
let fail = 0;

function check(name, expected, actual) {
    if (String(expected) === String(actual)) {
        pass += 1;
        console.log(`PASS: ${name}`);
    } else {
        fail += 1;
        console.log(`FAIL: ${name} -- expected=${expected} got=${actual}`);
    }
}

async function req(method, path, { body, token } = {}) {
    const res = await fetch(B + path, {
        method,
        headers: {
            // better-auth CSRF guard requires a trusted Origin on POSTs.
            Origin: 'http://localhost:5173',
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try {
        json = await res.json();
    } catch {
        /* non-JSON */
    }
    return { status: res.status, json };
}

// 1-3. Public blog
const list = await req('GET', '/public/blog');
check('public blog list has 4 posts', 4, list.json?.length);
const one = await req('GET', '/public/blog/ket-size-guide');
check('public blog slug fetch', 'راهنمای ان', one.json?.title?.slice(0, 10));
check('unknown slug 404', 404, (await req('GET', '/public/blog/nope')).status);

// 4. Admin sign-in
const admin = await req('POST', '/auth/sign-in/email', {
    body: { email: 'admin@polarisstyle.ir', password: 'PolarisAdmin123!' },
});
const AT = admin.json?.token;
check('admin sign-in token', true, Boolean(AT));

// 5. Admin blog CRUD
const draft = await req('POST', '/blog', {
    token: AT,
    body: {
        slug: 'smoke-test-post',
        title: 'مطلب آزمایشی',
        excerpt: 'خلاصه آزمایشی',
        body: [{ text: 'متن آزمایشی' }],
        status: 'draft',
        tags: ['تست'],
    },
});
const DID = draft.json?.id;
check('admin create draft post', true, Boolean(DID));
const pubCount = async () =>
    ((await req('GET', '/public/blog')).json ?? []).filter((p) => p.slug === 'smoke-test-post').length;
check('draft not public', 0, await pubCount());
const upd = await req('PUT', `/blog/${DID}`, { token: AT, body: { status: 'published' } });
check('publish draft', 'published', upd.json?.status);
check('published post now public', 1, await pubCount());
const del = await req('DELETE', `/blog/${DID}`, { token: AT });
check('delete post', 'مطلب وبلاگ حذف شد', del.json?.message);

// 6. Duplicate slug -> 409
const dup = await req('POST', '/blog', {
    token: AT,
    body: { slug: 'ket-size-guide', title: 'ت', excerpt: 'ت', body: [{ text: 'ت' }] },
});
check('duplicate slug 409', 409, dup.status);

// 7. Fresh customer signup -> role user
const rnd = Math.floor(1000 + Math.random() * 9000);
const phone = `0912123${String(rnd).padStart(4, '0')}`;
const cust = await req('POST', '/auth/sign-up/email', {
    body: { name: `مشتری تست ${rnd}`, email: `customer${rnd}@test.ir`, password: 'Customer123!' },
});
const CT = cust.json?.token;
check('customer signup token', true, Boolean(CT));
const session = await req('GET', '/auth/get-session', { token: CT });
check('signup default role is user', 'user', session.json?.user?.role);

// 8. Customer order flow — pick a real in-stock item
const items = (await req('GET', '/public/items')).json ?? [];
const item = items.find((i) => i.inStock);
if (!item) {
    check('find in-stock item', 'an in-stock item', 'none');
} else {
    console.log(`PASS: found in-stock item ${item.code}`);
    pass += 1;

    const ord = await req('POST', '/orders', {
        token: CT,
        body: {
            customerName: 'مشتری تست',
            phone,
            city: 'تهران',
            address: 'خیابان ولیعصر، پلاک ۱۲',
            paymentMethod: 'cod',
            lines: [{ itemId: item.id, quantity: 1, size: 'L' }],
        },
    });
    const OID = ord.json?.id;
    check('create order', true, Boolean(OID));
    if (OID) {
        console.log(`      order ${ord.json.code} total=${ord.json.total}`);
        check('order price snapshot = retailPrice', item.retailPrice, ord.json.items[0].price);
        check('orders/mine has 1', 1, ((await req('GET', '/orders/mine', { token: CT })).json ?? []).length);

        // 9. Admin sees + cancels (restock) + re-confirms (destock)
        const all = (await req('GET', '/orders', { token: AT })).json ?? [];
        check('admin sees order', 1, all.filter((o) => o.id === OID).length);
        const cancel = await req('PUT', `/orders/${OID}`, { token: AT, body: { status: 'cancelled' } });
        check('admin cancel order', 'cancelled', cancel.json?.status);
        const confirm = await req('PUT', `/orders/${OID}`, { token: AT, body: { status: 'confirmed' } });
        check('admin re-confirm order', 'confirmed', confirm.json?.status);
    }

    // 10. Oversized quantity rejected
    const big = await req('POST', '/orders', {
        token: CT,
        body: {
            customerName: 'ت',
            phone,
            address: 'آدرس آزمایشی بلند',
            paymentMethod: 'cod',
            lines: [{ itemId: item.id, quantity: 99999 }],
        },
    });
    check('insufficient stock 400', 400, big.status);
}

// 11. Customer must NOT reach admin/author surfaces
check('customer blocked from /blog', 403, (await req('GET', '/blog', { token: CT })).status);
check('customer blocked from all-orders', 403, (await req('GET', '/orders', { token: CT })).status);
check('customer blocked from dashboard/stats', 403, (await req('GET', '/dashboard/stats', { token: CT })).status);
check('customer blocked from /items', 403, (await req('GET', '/items', { token: CT })).status);

// 12. Anonymous blocked from orders
check('anonymous blocked from orders/mine', 401, (await req('GET', '/orders/mine')).status);

// 13. Workshop mount mirrors the legacy mount (Phase-2 alias contract)
check('workshop mount: admin dashboard/stats', 200, (await req('GET', '/workshop/dashboard/stats', { token: AT })).status);
check('workshop mount: admin items list', 200, (await req('GET', '/workshop/items', { token: AT })).status);
check('workshop mount: admin sellers list', 200, (await req('GET', '/workshop/sellers', { token: AT })).status);
check('workshop mount: admin audit-logs', 200, (await req('GET', '/workshop/audit-logs', { token: AT })).status);
check('workshop mount: admin orders list', 200, (await req('GET', '/workshop/orders', { token: AT })).status);
check('customer blocked from /workshop/items', 403, (await req('GET', '/workshop/items', { token: CT })).status);
check('anonymous blocked from /workshop/dashboard/stats', 401, (await req('GET', '/workshop/dashboard/stats')).status);

console.log('----------------------------------------');
console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
