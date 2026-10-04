/**
 * Frontend mirror of the backend permission table
 * (`backend/src/modules/auth/permissions.ts`). The backend is the source of
 * truth for RBAC enforcement; this file only drives UI gating (nav items,
 * route guards). Keep the two in lockstep: when a permission is added there,
 * add it here so the nav can hide/gate the corresponding surface.
 *
 * `user` gets no console permissions — customer capabilities are enforced
 * by requireAuth + owner scoping in the controllers, never by this table.
 */

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
    // Returns & damage (/console/returns)
    'returns.view',
    'returns.manage',
    // Blog CMS (/console/website/blog)
    'blog.manage',
    // Backups module (console settings → پشتیبان‌گیری)
    'backup.read',
    'backup.run',
    'backup.download',
    'backup.delete',
    'backup.restore',
] as const;

export type Permission = (typeof PERMISSIONS)[number];


export type Role = 'admin' | 'author' | 'user' | 'staff';

/** Roles that may enter the /console surface at all (staff sees its view subset). */
export const CONSOLE_ACCESS: readonly Role[] = ['admin', 'author', 'staff'];
const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
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
    ],
};

function roleOf(role: string | null | undefined): Role {
    return role === 'admin' || role === 'author' || role === 'user' || role === 'staff'
        ? role
        : 'user';
}

/** True when `role` has been granted `permission`. */
export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
    return ROLE_PERMISSIONS[roleOf(role)].includes(permission);
}
