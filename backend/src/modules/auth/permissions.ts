import type { NextFunction, Request, Response } from 'express';

/**
 * Permission-based RBAC for the workshop/API surface.
 *
 * Roles are the ones better-auth stores on `user.role`: admin, author, user
 * (+ legacy staff). Permissions are coarse capability names decoupled from
 * routes so gates stay meaningful when a route moves. `requirePermission`
 * mirrors the semantics of `requireAuth`/`requireRole` (Persian 401/403).
 *
 * `user` gets no workshop permissions here: customer capabilities
 * (orders/addresses) are enforced by requireAuth + owner scoping in the
 * controllers, not by this table.
 */

export type Role = 'admin' | 'author' | 'user' | 'staff';

export const PERMISSIONS = [
    // Inventory & consignment operations (/console)
    'inventory.view',
    'inventory.manage',
    'consignments.view',
    'consignments.manage',
    // Store orders (/console/orders)
    'orders.view',
    'orders.manage',
    // Finances, payments, expenses, reports (/console/finances)
    'finances.view',
    'finances.manage',
    // Sellers + staff (/console/people)
    'people.view',
    'people.manage',
    // Analytics + reports (/console/analytics, /console/finances/reports)
    'analytics.view',
    'reports.view',
    // Console + website settings (/console/settings, /console/website/*)
    'settings.manage',
    'website.manage',
    // Returns & damage (/console/returns) — its own surface, own gate
    'returns.view',
    'returns.manage',
    // Blog CMS (/console/website/blog) — the controlpanel access today
    'blog.manage',
    // Supply / purchasing (P0-C: /console/supply) — suppliers, requests,
    // orders, receipts, landed cost. Financial figures additionally gated.
    'suppliers.view',
    'suppliers.manage',
    'purchasing.view',
    'purchasing.manage',
    'purchasing.approve',
    'purchasing.receive',
    'supplycosts.manage',
    'purchasefinance.view',
    // Backups module (console settings → پشتیبان‌گیری)
    'backup.read',
    'backup.run',
    'backup.download',
    'backup.delete',
    'backup.restore',
    // P0-D: Unified Sales — orders, seller sales, payments, customers, channels
    'sales.view',
    'sales.manage',
    'seller-sales.view',
    'seller-sales.manage',
    'customers.view',
    'customers.manage',
    'channels.view',
    'channels.manage',
    'payments.view',
    'payments.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
    admin: [...PERMISSIONS],
    // Authors reach the console for the blog only — today's /controlpanel.
    author: ['blog.manage'],
    user: [],
    // View-level subset; final composition lands with the P0-C/D services.
    staff: [
        'inventory.view',
        'consignments.view',
        'orders.view',
        'people.view',
        'returns.view',
        'analytics.view',
        'reports.view',
        'suppliers.view',
        'purchasing.view',
        // P0-D: staff-level view access to sales data.
        'sales.view',
        'seller-sales.view',
        'customers.view',
        'channels.view',
        'payments.view',
    ],
};

const DEFAULT_ROLE: Role = 'user';

function roleOf(role: string | null | undefined): Role {
    return role === 'admin' || role === 'author' || role === 'user' || role === 'staff'
        ? role
        : DEFAULT_ROLE;
}

/** True when `role` has been granted `permission`. */
export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
    return ROLE_PERMISSIONS[roleOf(role)].includes(permission);
}

/**
 * Permission guard factory. Requires an authenticated session whose role
 * grants the permission; Persian 401 (anonymous) / 403 (unauthorized role).
 */
export function requirePermission(permission: Permission) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.auth) {
            res.status(401).json({ error: 'ابتدا وارد حساب کاربری خود شوید' });
            return;
        }
        if (!hasPermission(req.auth.user.role, permission)) {
            res.status(403).json({ error: 'شما اجازه انجام این عمل را ندارید' });
            return;
        }
        next();
    };
}
