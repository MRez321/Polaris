import { v4 as uuid } from 'uuid';

import { db } from '../config/drizzle.js';
import { auditLogs } from '../schema/index.js';
import type { AuditLog } from '../types/index.js';

export interface AuditActor {
    id: string;
    name: string;
    role?: string | null;
    ip?: string;
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
            userId: actor?.id ?? '',
            userName: actor?.name ?? 'سیستم',
            ...(actor?.role ? { userRole: actor.role } : {}),
            action,
            entity,
            details,
            ...(actor?.ip ? { ipAddress: actor.ip } : {}),
        })
        .catch((err: unknown) => {
            console.error('⚠️ Failed to write audit log:', err);
        });
}
