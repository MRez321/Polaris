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
    // Blog CMS (controlpanel authors + admins)
    'blog.manage',
    // Backups module (workshop settings → پشتیبان‌گیری)
    'backup.read',
    'backup.run',
    'backup.download',
    'backup.delete',
    'backup.restore',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
    admin: [...PERMISSIONS],
    author: ['blog.manage'],
    user: [],
    staff: [],
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
