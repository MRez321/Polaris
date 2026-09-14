/**
 * P0-A-04 — Role-based permission catalog.
 *
 * `requireRole` answers "is this role in the list"; permissions answer
 * "what concrete operation is this role allowed to perform". Sensitive
 * operations (backups, settings, user management, audit) declare a required
 * permission so the check lives next to the route, not inside controllers.
 *
 * Rules:
 *  - Roles mirror better-auth's: admin, author, user. No new roles invented.
 *  - admin: full permission set (Polaris is a single-workshop app; the admin
 *    is the operator). backup.restore stays admin-only — the most dangerous
 *    operation in the system.
 *  - author: content authoring (blog) only.
 *  - user: customer self-service (orders/addresses are protected by
 *    requireAuth + ownership checks, not by permission grants).
 */

export const PERMISSIONS = [
    // Content
    'blog.read',
    'blog.write',
    'blog.delete',
    // Workshop master data (admin workshop panel)
    'workshop.read',
    'workshop.write',
    // Website/company settings + branding
    'settings.read',
    'settings.write',
    // Notification integrations (Telegram/Melipayamak credentials)
    'notifications.read',
    'notifications.write',
    // User management (better-auth admin plugin surfaces)
    'users.read',
    'users.write',
    // Audit trail
    'audit.read',
    // Backups — create and restore are deliberately separate privileges
    'backup.create',
    'backup.download',
    'backup.delete',
    'backup.restore',
    'backup.settings',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const AUTHOR_PERMISSIONS: Permission[] = ['blog.read', 'blog.write', 'blog.delete'];

const ADMIN_PERMISSIONS: Permission[] = [...PERMISSIONS];

/** Role → permission set. `user` grants nothing beyond requireAuth+ownership. */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    admin: ADMIN_PERMISSIONS,
    author: AUTHOR_PERMISSIONS,
    user: [],
};

/**
 * True when the role holds the permission. Unknown roles hold nothing —
 * a closed allowlist (fail closed, never fail open).
 */
export function roleHas(role: string | null | undefined, permission: Permission): boolean {
    const grants = ROLE_PERMISSIONS[role ?? 'user'];
    return grants !== undefined && grants.includes(permission);
}
