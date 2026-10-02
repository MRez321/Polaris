import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '../../config/drizzle.js';
import { auditLogs, user as users } from '../../schema/index.js';
import type { AuditLog } from '../../types/index.js';
import type { DbTx } from './inventoryLedgerService.js';

/** Minimal queryable surface shared by the connection pool and a transaction. */
export type AuditDb = { select: DbTx['select'] };

export interface AuditActor {
    user: {
        id: string;
        name: string;
        role?: string | null;
    };
}

const AuditActorSchema = z.object({
    user: z.object({
        id: z.string(),
        name: z.string(),
        role: z.string().nullable().optional(),
    }),
});

/**
 * Legacy positional audit logger, kept as a thin wrapper over recordAudit so
 * older call sites and external tooling keep compiling. All first-party call
 * sites now use recordAudit directly, which adds entityType/entityId,
 * before/after snapshots and the request user-agent.
 */
export function logAudit(
    actor: AuditActor | null,
    action: string,
    entity: AuditLog['entity'],
    details: string,
    ip?: string,
): void {
    recordAudit({
        actor,
        action,
        entityType: entity,
        details,
        ...(ip !== undefined ? { ip } : {}),
    });
}

// ---------------------------------------------------------------------------
// recordAudit (P0-B item 27) — enriched structured audit trail.
// logAudit stays as a thin wrapper for the ~65 existing call sites, all of
// which migrate to recordAudit in this part.
// ---------------------------------------------------------------------------

const SECRET_KEY_RE = /(password|token|secret|authorization|cookie|twoFactor)/i;

function stripSecrets(value: unknown, depth = 0): unknown {
    if (depth > 8) return '[max-depth]';
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((v) => stripSecrets(v, depth + 1));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (SECRET_KEY_RE.test(k)) {
            out[k] = '[redacted]';
        } else {
            out[k] = stripSecrets(v, depth + 1);
        }
    }
    return out;
}

const recordAuditPayloadSchema = z.object({
    actor: AuditActorSchema.nullable(),
    action: z.string().min(1).max(64),
    entityType: z.string().min(1).max(64),
    entityId: z.string().max(64).optional(),
    before: z.unknown().optional(),
    after: z.unknown().optional(),
    metadata: z.unknown().optional(),
    ip: z.string().max(64).optional(),
    userAgent: z.string().max(255).optional(),
    details: z.string().max(2000).optional(),
});

export interface RecordAuditInput {
    actor: AuditActor | null;
    action: string;
    entityType: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
    metadata?: unknown;
    ip?: string;
    userAgent?: string;
    details?: string;
    /**
     * When provided, the audit row is written on the caller's transaction
     * connection (ordered before its commit), so it commits and rolls back
     * with the business operation. Failures are still logged, never thrown.
     * Omitted at the controller layer, where the write is pool fire-and-forget.
     */
    tx?: DbTx;
}

/**
 * Fire-and-forget enriched audit writer. Strips secrets from before/after/
 * metadata (deep, key-name based), fills entity (legacy column) from
 * entityType for backward compatibility, and never throws — auditing must
 * not break business operations. Pass `tx` to write on the caller's
 * transaction connection instead of the pool (the row commits/rolls back
 * with the business operation).
 */
export function recordAudit(input: RecordAuditInput): void {
    const parsed = recordAuditPayloadSchema.safeParse(input);
    if (!parsed.success) {
        console.error('⚠️ recordAudit payload rejected:', parsed.error.message);
        return;
    }
    const v = parsed.data;
    const row = {
        id: uuid(),
        userId: v.actor?.user.id ?? '',
        userName: v.actor?.user.name ?? 'سیستم',
        ...(v.actor?.user.role ? { userRole: v.actor.user.role } : {}),
        action: v.action,
        entity: v.entityType.slice(0, 32),
        entityType: v.entityType,
        ...(v.entityId !== undefined ? { entityId: v.entityId } : {}),
        ...(v.before !== undefined ? { beforeJson: stripSecrets(v.before) } : {}),
        ...(v.after !== undefined ? { afterJson: stripSecrets(v.after) } : {}),
        ...(v.metadata !== undefined ? { metadata: stripSecrets(v.metadata) } : {}),
        ...(v.userAgent !== undefined ? { userAgent: v.userAgent } : {}),
        details: v.details ?? `${v.action} ${v.entityType}${v.entityId ? ` ${v.entityId}` : ''}`,
        ...(v.ip !== undefined ? { ipAddress: v.ip } : {}),
    };
    const runner: { insert: DbTx['insert'] } = input.tx ?? db;
    void runner
        .insert(auditLogs)
        .values(row)
        .catch((err: unknown) => {
            console.error('⚠️ Failed to write audit log:', err);
        });
}
/**
 * Resolves a structured audit actor from a user id, looked up on the given
 * runner (a transaction whose row ordering matters, or the pool for
 * non-transactional call sites). Returns null on lookup failure — audit rows
 * degrade to the `سیستم` actor rather than breaking the business operation.
 */
export async function entityActor(runner: AuditDb, actorId?: string): Promise<AuditActor | null> {
    if (!actorId) return null;
    try {
        const rows = await runner.select().from(users).where(eq(users.id, actorId)).limit(1);
        const u = rows[0];
        return u ? { user: { id: u.id, name: u.name, role: u.role } } : null;
    } catch {
        return null;
    }
}
