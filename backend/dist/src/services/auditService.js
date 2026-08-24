import { v4 as uuid } from 'uuid';
import { db } from '../config/drizzle.js';
import { auditLogs } from '../schema/index.js';
/**
 * Fire-and-forget audit logger. Failures are logged, never thrown —
 * auditing must not break business operations.
 */
export function logAudit(actor, action, entity, details) {
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
        .catch((err) => {
        console.error('⚠️ Failed to write audit log:', err);
    });
}
//# sourceMappingURL=auditService.js.map