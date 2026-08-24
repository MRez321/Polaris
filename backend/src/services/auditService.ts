import { v4 as uuid } from 'uuid';

import { db } from '../config/drizzle.js';
import { auditLogs } from '../schema/index.js';
import type { AuditLog } from '../types/index.js';

export interface AuditActor {
    user: {
        id: string;
        name: string;
        role?: string | null;
    };
}

/**
 * Fire-and-forget audit logger. Failures are logged, never thrown —
 * auditing must not break business operations.
 */
export function logAudit(
    actor: AuditActor | null,
    action: string,
    entity: AuditLog['entity'],
    details: string,
): void {
    void db
        .insert(auditLogs)
        .values({
            id: uuid(),
            userId: actor?.user.id ?? '',
            userName: actor?.user.name ?? 'سیستم',
            ...(actor?.user.role ? { userRole: actor.user.role } : {}),
            action,
            entity,
            details,
        })
        .catch((err: unknown) => {
            console.error('⚠️ Failed to write audit log:', err);
        });
}
