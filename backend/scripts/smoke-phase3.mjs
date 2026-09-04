// Phase-3 smoke: shop channel allocation, unit accounting across buckets,
// public catalog gating, order decrement/restore, and handover free-stock
// guard. Runs against http://localhost:3016 (backend dev server) and uses
// the seeded admin + a scratch item it cleans up afterwards.
const BASE = 'http://localhost:3016/api';
const W = '/workshop';
let failures = 0;
let TOKEN = '';
const itemsById = async (id) => {
    const list = await req('GET', `${W}/items`);
    return (Array.isArray(list.data) ? list.data : []).find((i) => i.id === id) ?? null;
};

async function req(method, path, body) {
    const res = await fetch(BASE + path, {
        method,
        headers: {
            // better-auth CSRF guard requires a trusted Origin on POSTs.
            Origin: 'http://localhost:5173',
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
}

function check(name, cond, extra) {
    if (cond) console.log(`  ✅ ${name}`);
    else { failures++; console.log(`  ❌ ${name}`, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

// 0. Admin sign-in
{
    const res = await req('POST', '/auth/sign-in/email', {
        email: 'admin@polarisstyle.ir',
        password: 'PolarisAdmin123!',
    });
    check('admin sign-in', res.status === 200 && res.data.token, { status: res.status, body: res.data });
    TOKEN = res.data.token ?? '';
}

// 1. Scratch item with 10 free units
let r = await req('POST', `${W}/items`, {
    name: 'آزمون تخصیص فروشگاه',
    category: 'coats_jackets',
    costPrice: 100000,
    consignmentPrice: 150000,
    retailPrice: 200000,
    stockQuantity: 10,
    minStockThreshold: 2,
    sizes: ['M'],
    colors: ['زرد'],
    fabric: 'تست',
});
check('create scratch item', r.status === 201 && r.data.id, r);
const item = r.data;
check('item starts unallocated', r.data.websiteQuantity === 0 && r.data.stockQuantity === 10, r.data);

// 2. Not allocated → absent from public catalog
r = await req('GET', '/public/items');
const pubOf = (res) => (Array.isArray(res.data) ? res.data : res.data?.items ?? []);
check('public catalog excludes unallocated item', !pubOf(r).some((p) => p.id === item.id), {
    pubCount: pubOf(r).length,
});

// 3. Allocate 3 of 10 → stock 7 / website 3 (websiteQuantity is absolute target)
r = await req('PUT', `${W}/items/${item.id}/shop-allocation`, { websiteQuantity: 3 });
check('allocate 3 units (200)', r.status === 200, r);
check('buckets after allocate: stock 7 / website 3', r.data.stockQuantity === 7 && r.data.websiteQuantity === 3, r.data);

// 4. Now listed publicly, inStock true, no stock counts leaked
r = await req('GET', '/public/items');
const pubItem = pubOf(r).find((p) => p.id === item.id);
check('public catalog includes allocated item', Boolean(pubItem), { pubCount: pubOf(r).length });
check('public item inStock=true', pubItem?.inStock === true, pubItem);
check(
    'public item leaks no stock counts',
    pubItem && !('stockQuantity' in pubItem) && !('websiteQuantity' in pubItem) && !('sellerHeld' in pubItem),
    pubItem
);

// 5. True over-allocation: target 11 > 10 total units → 400
r = await req('PUT', `${W}/items/${item.id}/shop-allocation`, { websiteQuantity: 11 });
check('over-allocation beyond total units rejected 400', r.status === 400, r);
if (r.status === 400) console.log('      پیام:', r.data?.message ?? r.data?.error);

// 6. Lower allocation: 3 → 1 returns 2 units to warehouse
r = await req('PUT', `${W}/items/${item.id}/shop-allocation`, { websiteQuantity: 1 });
check('lower allocation: stock 9 / website 1', r.status === 200 && r.data.stockQuantity === 9 && r.data.websiteQuantity === 1, r.data);

// 7. Raise to 4 for the order test
r = await req('PUT', `${W}/items/${item.id}/shop-allocation`, { websiteQuantity: 4 });
check('raise allocation: stock 6 / website 4', r.status === 200 && r.data.stockQuantity === 6 && r.data.websiteQuantity === 4, r.data);

// 8. Customer order draws from the website pool only
r = await req('POST', '/orders', {
    lines: [{ itemId: item.id, quantity: 2, size: 'M', color: 'زرد' }],
    customerName: 'مشتری آزمون',
    phone: '09120000000',
    city: 'تهران',
    address: 'خیابان آزمون، پلاک ۱',
    paymentMethod: 'cod',
});
check('place order 2 units (201)', r.status === 201, r);
const order = r.data;

// 9. website pool decremented, warehouse untouched
const afterOrder = await itemsById(item.id);
check(
    'order decrement: website 2 / stock 6',
    afterOrder.stockQuantity === 6 && afterOrder.websiteQuantity === 2,
    { stock: afterOrder.stockQuantity, web: afterOrder.websiteQuantity }
);

// 10. Over-ordering beyond website pool rejected (only 2 in shop pool)
r = await req('POST', '/orders', {
    lines: [{ itemId: item.id, quantity: 3, size: 'M', color: 'زرد' }],
    customerName: 'مشتری آزمون',
    phone: '09120000000',
    city: 'تهران',
    address: 'خیابان آزمون، پلاک ۱',
    paymentMethod: 'cod',
});
check('order beyond website pool rejected 400', r.status === 400, r);

// 11. Handover free-stock guard with a valid seller: 6 free, ask 7 → 400
const sellers = await req('GET', `${W}/sellers`);
const sellerId = Array.isArray(sellers.data) ? sellers.data[0]?.id : undefined;
if (sellerId) {
    r = await req('POST', `${W}/consignments`, {
        sellerId,
        dueDate: '2026-12-01',
        itemsList: [{ itemId: item.id, quantity: 7, unitPrice: 150000 }],
    });
    check('handover exceeding free stock rejected 400', r.status === 400, r);
    if (r.status === 400) console.log('      پیام:', r.data?.message ?? r.data?.error);

    // 11b. Handover of 5 (within free 6) succeeds → sellerHeld 5, stock 1
    r = await req('POST', `${W}/consignments`, {
        sellerId,
        dueDate: '2026-12-01',
        itemsList: [{ itemId: item.id, quantity: 5, unitPrice: 150000 }],
    });
    check('handover within free stock created', r.status === 201 || r.status === 200, r);
    const consignment = r.data?.id ? r.data : null;

    const held = await itemsById(item.id);
    check(
        'after handover: stock 1 / website 2 / held 5 (invariant 8)',
        held.stockQuantity === 1 && held.websiteQuantity === 2 && (held.sellerHeld ?? 0) === 5,
        { stock: held.stockQuantity, web: held.websiteQuantity, held: held.sellerHeld }
    );

    // cleanup consignment (delete → restores stock)
    if (consignment) {
        const del = await req('DELETE', `${W}/consignments/${consignment.id}`);
        check('cleanup consignment', del.status === 200 || del.status === 204, del);
    }
} else {
    console.log('  ⚠️ no sellers seeded — skipping valid-seller handover checks');
}

// 12. Admin cancels order → website pool restored (PUT workshop route)
r = await req('PUT', `${W}/orders/${order.id}`, { status: 'cancelled' });
check('admin cancel order', r.status === 200 || r.status === 204, r);
const restored = await itemsById(item.id);
// Deleting the consignment does NOT restock (pre-existing workshop semantics:
// units return to the warehouse via the Returns flow), so free stock stays 1.
check(
    'cancel restores website pool: web 4 / stock 1 / held 0',
    restored.stockQuantity === 1 && restored.websiteQuantity === 4 && (restored.sellerHeld ?? 0) === 0,
    { stock: restored.stockQuantity, web: restored.websiteQuantity, held: restored.sellerHeld }
);

// 13. Zero allocation hides item from catalog again + returns all units
r = await req('PUT', `${W}/items/${item.id}/shop-allocation`, { websiteQuantity: 0 });
check('zero allocation: stock 5 / website 0 (1 free + 4 returned)', r.status === 200 && r.data.stockQuantity === 5 && r.data.websiteQuantity === 0, r.data);
r = await req('GET', '/public/items');
check('item hidden after zeroing allocation', !pubOf(r).some((p) => p.id === item.id), { pubCount: pubOf(r).length });

// 14. Dashboard stats include website pool in inventory value
r = await req('GET', `${W}/stats`);
const statsBefore = r.data;
if (statsBefore && typeof statsBefore.totalInventoryValue === 'number') {
    await req('PUT', `${W}/items/${item.id}/shop-allocation`, { websiteQuantity: 4 });
    const r2 = await req('GET', `${W}/stats`);
    // Value must grow by exactly 4 × costPrice (100000) = 400000:
    // moving units between pools doesn't change totals, only inclusion does.
    check(
        'dashboard value includes website pool',
        r2.data.totalInventoryValue === statsBefore.totalInventoryValue + 4 * 100000,
        { before: statsBefore.totalInventoryValue, after: r2.data.totalInventoryValue }
    );
    await req('PUT', `${W}/items/${item.id}/shop-allocation`, { websiteQuantity: 0 });
} else {
    check('dashboard stats endpoint reachable', Boolean(statsBefore), r);
}

// 15. Cleanup scratch item
r = await req('DELETE', `${W}/items/${item.id}`);
check('cleanup scratch item', r.status === 200 || r.status === 204, r);

console.log(failures === 0 ? '\n✅ همه بررسی‌های تخصیص فروشگاه پاس شدند' : `\n❌ ${failures} بررسی شکست خورد`);
process.exit(failures === 0 ? 0 : 1);
