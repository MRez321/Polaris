// End-to-end smoke test against http://localhost:3016
// Workshop (admin business-tracking) routes live under /api/workshop and are
// role-gated: sign in first and attach the Bearer token. Global surfaces
// (health, auth, company) stay on plain /api.
const BASE = 'http://localhost:3016/api';
const W = '/workshop'; // admin workshop prefix, appended to BASE
let failures = 0;
let TOKEN = '';

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
    let data;
    const text = await res.text();
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
}

function check(name, cond, extra) {
    if (cond) console.log(`  ✅ ${name}`);
    else { failures++; console.log(`  ❌ ${name}`, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); }
}

// 0. Admin bootstrap (all /api/* workshop routes are admin-gated)
{
    const res = await req('POST', '/auth/sign-in/email', {
        email: 'admin@polarisstyle.ir',
        password: 'PolarisAdmin123!',
    });
    check('admin sign-in', res.status === 200 && res.data.token, { status: res.status });
    TOKEN = res.data.token ?? '';
}

// 1. Health
let r = await req('GET', '/health');
// 2. Categories (seeded)
r = await req('GET', W + '/categories');
const itemsBefore = await req('GET', W + '/items');
const baselineItemCount = Array.isArray(itemsBefore.data) ? itemsBefore.data.length : 0;
check('categories seeded (7)', r.status === 200 && Array.isArray(r.data) && r.data.length === 7, r);

// 3. Create item
r = await req('POST', W + '/items', {
    name: 'کاپشن زمستانی مردانه',
    category: 'coats_jackets',
    costPrice: 850000,
    consignmentPrice: 1100000,
    retailPrice: 1450000,
    stockQuantity: 20,
    minStockThreshold: 3,
    sizes: ['L', 'XL', 'XXL'],
    colors: ['مشکی', 'سرمه‌ای'],
    fabric: 'میکرو ضدآب',
});
check('create item 201', r.status === 201 && r.data.code?.startsWith('PLR-'), r);
const item = r.data;
check('item categoryLabel derived', item.categoryLabel === 'کت، کاپشن و پالتو', item.categoryLabel);

// second item for multi-line handover
r = await req('POST', W + '/items', {
    name: 'شلوار جین اسلش',
    category: 'pants',
    costPrice: 400000,
    consignmentPrice: 550000,
    retailPrice: 750000,
    stockQuantity: 15,
    sizes: ['32', '34'],
    colors: ['آبی'],
});
check('create item2 201', r.status === 201, r);
const item2 = r.data;

// 4. List items
r = await req('GET', W + '/items');
check('list items grew by 2', r.status === 200 && r.data.length === baselineItemCount + 2, { before: baselineItemCount, after: r.data?.length });

// 5. Update item
r = await req('PUT', W + `/items/${item.id}`, { stockQuantity: 25 });
check('update item stock', r.status === 200 && r.data.stockQuantity === 25, r);

// 6. Create seller
r = await req('POST', W + '/sellers', {
    name: 'فروشگاه برادران احمدی',
    phone: '09121234567',
    streetLocation: 'بازار بزرع، راسته پوشاک',
    hasGuarantee: true,
    guaranteeType: 'cheque',
    guaranteeAmount: 5000000,
    creditLimit: 20000000,
    bankAccounts: [{ bankName: 'ملی', cardNumber: '6037-9911-1234-5678', shebaNumber: 'IR1234567890' }],
});
check('create seller 201', r.status === 201 && r.data.code?.startsWith('SLR-'), r);
const seller = r.data;

// 7. Handover (consignment)
const due = new Date(Date.now() + 30 * 86400000).toISOString();
r = await req('POST', W + '/consignments', {
    sellerId: seller.id,
    dueDate: due,
    notes: 'تحویل اول فصل',
    itemsList: [
        { itemId: item.id, quantity: 5, unitPrice: 1100000, selectedSize: 'XL', selectedColor: 'مشکی' },
        { itemId: item2.id, quantity: 4, unitPrice: 550000 },
    ],
});
check('handover 201', r.status === 201 && r.data.code?.startsWith('HND-'), r);
const cons = r.data;
check('handover totalAmount', cons.totalAmount === 5 * 1100000 + 4 * 550000, cons.totalAmount);
check('handover remainingAmount', cons.remainingAmount === cons.totalAmount, cons.remainingAmount);

// stock decremented?
r = await req('GET', W + '/items');
const it1 = r.data.find((i) => i.id === item.id);
const it2 = r.data.find((i) => i.id === item2.id);
check('stock decremented item1 (25→20)', it1.stockQuantity === 20, it1.stockQuantity);
check('stock decremented item2 (15→11)', it2.stockQuantity === 11, it2.stockQuantity);

// seller debt updated?
r = await req('GET', W + `/sellers/${seller.id}`);
check('seller currentDebt', r.data.currentDebt === cons.totalAmount, r.data.currentDebt);
check('seller totalHandoversValue', r.data.totalHandoversValue === cons.totalAmount, r.data.totalHandoversValue);

// 8. Payment (FIFO)
r = await req('POST', W + '/payments', {
    sellerId: seller.id,
    amount: 3000000,
    paymentMethod: 'کارت به کارت',
    trackingNumber: 'TRK-123',
});
check('payment 201', r.status === 201 && r.data.code?.startsWith('PAY-'), r);
const pay = r.data;
check('payment allocations exist', Array.isArray(pay.allocations) && pay.allocations.length === 1, pay.allocations);
check('allocation amount 3M', pay.allocations[0]?.allocatedAmount === 3000000, pay.allocations);
check('allocation settled flag', pay.allocations[0]?.isFullySettled === false, pay.allocations);

// consignment partially settled
r = await req('GET', W + '/consignments');
const cons2 = r.data.find((c) => c.id === cons.id);
check('consignment partially_settled', cons2.status === 'partially_settled', cons2.status);
check('consignment remainingAmount reduced', cons2.remainingAmount === cons.totalAmount - 3000000, cons2.remainingAmount);

// seller debt reduced
r = await req('GET', W + `/sellers/${seller.id}`);
check('seller debt after payment', r.data.currentDebt === cons.totalAmount - 3000000, r.data.currentDebt);
check('seller totalPaid', r.data.totalPaid === 3000000, r.data.totalPaid);

// 9. Return (healthy restock)
r = await req('POST', W + '/consignments/return', {
    consignmentId: cons.id,
    returnItems: [{ itemId: item.id, quantity: 2, condition: 'healthy', reason: 'عدم فروش' }],
    notes: 'مرجوعی تست',
});
check('return 201', r.status === 201 && r.data.returnRecord && r.data.updatedConsignment, r);
const ret = r.data;
check('return totalReturnAmount', ret.returnRecord.totalReturnAmount === 2 * 1100000, ret.returnRecord);
// stock restocked?
r = await req('GET', W + '/items');
const it1b = r.data.find((i) => i.id === item.id);
check('stock restocked (20→22)', it1b.stockQuantity === 22, it1b.stockQuantity);

// consignment net reduced
check('updatedConsignment remainingAmount', ret.updatedConsignment.remainingAmount === cons.totalAmount - 3000000 - 2200000, ret.updatedConsignment.remainingAmount);

// 10. Dashboard (delta-based: DB accumulates rows across runs)
r = await req('GET', W + '/dashboard/stats');
check('dashboard 200', r.status === 200 && typeof r.data.totalActiveDebt === 'number', r);
check('dashboard includes this run\'s active consignment', r.data.activeConsignmentsCount >= 1, r.data.activeConsignmentsCount);
check('dashboard includes this run\'s items in hands', r.data.totalItemsInHands >= (5 - 2) + 4, r.data.totalItemsInHands);

// 11. Trash flow: delete item → trash → restore
r = await req('DELETE', W + `/items/${item2.id}`);
check('delete item → trash', r.status === 200, r);
r = await req('GET', W + '/trash');
check('trash lists item', r.status === 200 && r.data.items.some((i) => i.id === item2.id), r.data.items?.length);
r = await req('POST', W + `/trash/restore/item/${item2.id}`);
check('restore item', r.status === 200, r);
r = await req('GET', W + '/items');
check('item back in list', r.data.some((i) => i.id === item2.id), r.data.length);

// permanent delete
r = await req('DELETE', W + `/items/${item2.id}`);
r = await req('DELETE', W + `/trash/permanent/item/${item2.id}`);
check('permanent delete', r.status === 200, r);
r = await req('GET', W + '/trash');
check('trash empty of item2', !r.data.items.some((i) => i.id === item2.id), r.data.items?.length);

// 12. Company
r = await req('GET', '/company');
check('company seeded', r.status === 200 && r.data.brandName === 'پولاریس استایل', r.data.brandName);
r = await req('PUT', '/company', { tagline: 'دوخت تخصصی پوشاک زمستانه' });
check('company update', r.status === 200 && r.data.tagline === 'دوخت تخصصی پوشاک زمستانه', r);

// 13. Owners
r = await req('PUT', W + '/owners', {
    owners: [{ id: 'o1', name: 'محمدرضا', role: 'مدیر', sharePercentage: 60, nationalCode: '0012345678', phones: ['0912'], bankAccounts: [] }],
});
check('owners update', r.status === 200, r);
r = await req('GET', W + '/owners');
check('owners list', r.status === 200 && r.data.length === 1 && r.data[0].name === 'محمدرضا', r);

// 14. Staff
r = await req('POST', W + '/staff', {
    name: 'علی خیاط',
    role: 'tailor',
    roleTitle: 'خیاط ارشد',
    phones: ['09351112233'],
    salaryType: 'piecework',
    salaryAmount: 0,
});
check('create staff 201', r.status === 201 && r.data.code?.startsWith('STF-'), r);
const stf = r.data;
r = await req('PUT', W + `/staff/${stf.id}`, { status: 'leave' });
check('update staff', r.status === 200 && r.data.status === 'leave', r);

// 15. Expenses
r = await req('POST', W + '/expenses', {
    title: 'خرید نخ و زیپ',
    category: 'materials',
    amount: 250000,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    costAllocation: 'workshop_fund',
});
check('create expense 201', r.status === 201 && r.data.code?.startsWith('CST-'), r);
const exp = r.data;

// 16. Profit distribution
r = await req('POST', W + '/profit-distribution', {
    periodName: 'مرداد ۱۴۰۵',
    startDate: '2026-07-23',
    endDate: '2026-08-22',
    grossRevenue: 15000000,
    totalExpenses: 250000,
    netProfit: 14750000,
    distributionMode: 'percentage',
    recipients: [{ id: 'o1', name: 'محمدرضا', role: 'مدیر', shareUnits: 60, percentage: 60, assignedAmount: 8850000 }],
});
check('profit distribution 201', r.status === 201, r);

// 17. Audit logs
r = await req('GET', W + '/audit-logs');
const auditLogs = Array.isArray(r.data) ? r.data : (r.data?.logs ?? []);
check('audit logs recorded', r.status === 200 && auditLogs.length >= 10, auditLogs.length);

// 18. Auth endpoint (better-auth mounted)
r = await fetch(BASE + '/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify({ email: 'admin@polarisstyle.ir', password: 'PolarisAdmin123!' }),
}).then(async (res) => ({ status: res.status, data: await res.json().catch(() => null) }));
check('auth sign-in', r.status === 200 && r.data.user?.email === 'admin@polarisstyle.ir', r);
check('auth role admin', r.data.user?.role === 'admin', r.data.user?.role);

// 19. Error shape { error: string }
r = await req('POST', W + '/consignments', { sellerId: 'nonexistent', dueDate: due, itemsList: [{ itemId: 'x', quantity: 1, unitPrice: 1 }] });
check('error shape {error}', r.status >= 400 && typeof r.data.error === 'string', r);

console.log(failures === 0 ? '\n🎉 ALL SMOKE TESTS PASSED' : `\n💥 ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
