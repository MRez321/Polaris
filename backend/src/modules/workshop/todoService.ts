/**
 * Workshop todos — the admin's own task list rendered as the dashboard
 * todo widget. Follows the damage-records service pattern: drizzle CRUD,
 * soft delete, emitDataChanged after mutations.
 */
import { and, desc, eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import { db } from '../../config/drizzle.js';
import { workshopTodos } from '../../schema/index.js';
import { badRequest, notFound } from '../../core/utils/apiError.js';
import { emitDataChanged } from '../../core/services/socketService.js';

export type TodoPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TodoCreateInput {
    text: string;
    priority?: TodoPriority;
    /** ISO date string or null; stored as a datetime. */
    dueDate?: string | null;
}

export interface TodoUpdateInput {
    text?: string;
    priority?: TodoPriority;
    dueDate?: string | null;
}

/** Parses an ISO due date; '' → null (clears the deadline). */
function parseDueDate(value: string | null | undefined): Date | null {
    if (value === undefined) return undefined as unknown as Date | null;
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) throw badRequest('تاریخ سررسید نامعتبر است');
    return d;
}

export async function listTodos(includeDeleted = false) {
    return includeDeleted
        ? await db.select().from(workshopTodos).orderBy(desc(workshopTodos.createdAt))
        : await db
              .select()
              .from(workshopTodos)
              .where(eq(workshopTodos.isDeleted, false))
              .orderBy(desc(workshopTodos.createdAt));
}

export async function createTodo(data: TodoCreateInput) {
    if (!data.text?.trim()) throw badRequest('متن کار الزامی است');

    const id = uuid();
    await db.insert(workshopTodos).values({
        id,
        text: data.text.trim(),
        priority: data.priority ?? 'medium',
        ...(data.dueDate !== undefined ? { dueDate: parseDueDate(data.dueDate) ?? null } : {}),
    });
    const [created] = await db.select().from(workshopTodos).where(eq(workshopTodos.id, id));
    emitDataChanged('todo', 'create');
    return created!;
}

export async function updateTodo(id: string, data: TodoUpdateInput) {
    const [existing] = await db.select().from(workshopTodos).where(eq(workshopTodos.id, id));
    if (!existing || existing.isDeleted) throw notFound('کار موردنظر یافت نشد');

    await db
        .update(workshopTodos)
        .set({
            ...(data.text !== undefined ? { text: data.text.trim() } : {}),
            ...(data.priority !== undefined ? { priority: data.priority } : {}),
            ...(data.dueDate !== undefined ? { dueDate: parseDueDate(data.dueDate) ?? null } : {}),
            updatedAt: new Date(),
        })
        .where(eq(workshopTodos.id, id));
    const [updated] = await db.select().from(workshopTodos).where(eq(workshopTodos.id, id));
    emitDataChanged('todo', 'update');
    return updated!;
}

/** Flips done state; stamps/clears doneAt alongside. */
export async function toggleTodo(id: string) {
    const [existing] = await db.select().from(workshopTodos).where(eq(workshopTodos.id, id));
    if (!existing || existing.isDeleted) throw notFound('کار موردنظر یافت نشد');

    const nextDone = !existing.done;
    await db
        .update(workshopTodos)
        .set({ done: nextDone, doneAt: nextDone ? new Date() : null, updatedAt: new Date() })
        .where(eq(workshopTodos.id, id));
    const [updated] = await db.select().from(workshopTodos).where(eq(workshopTodos.id, id));
    emitDataChanged('todo', 'update');
    return updated!;
}

/** Soft-deletes every done task at once; returns the number removed. */
export async function clearDoneTodos() {
    const rows = await db
        .select({ id: workshopTodos.id })
        .from(workshopTodos)
        .where(and(eq(workshopTodos.isDeleted, false), eq(workshopTodos.done, true)));
    if (rows.length === 0) return 0;
    const now = new Date();
    for (const row of rows) {
        await db
            .update(workshopTodos)
            .set({ isDeleted: true, deletedAt: now, updatedAt: now })
            .where(eq(workshopTodos.id, row.id));
    }
    emitDataChanged('todo', 'delete');
    return rows.length;
}

export async function softDeleteTodo(id: string) {
    const [existing] = await db.select().from(workshopTodos).where(eq(workshopTodos.id, id));
    if (!existing || existing.isDeleted) throw notFound('کار موردنظر یافت نشد');

    const now = new Date();
    await db
        .update(workshopTodos)
        .set({ isDeleted: true, deletedAt: now, updatedAt: now })
        .where(eq(workshopTodos.id, id));
    emitDataChanged('todo', 'delete');
}
