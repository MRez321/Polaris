/**
 * Workshop todo endpoints. All routes mounted under /api/workshop behind
 * requireRole('admin'). Follows the damage controller pattern: Zod at the
 * boundary, ISO-string DTOs, Persian audit messages.
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { workshopTodos } from '../../../schema/index.js';
import * as svc from '../todoService.js';
import { logAudit } from '../../../core/services/auditService.js';
import { pathParam } from '../../../core/utils/apiError.js';

const priorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);

const createTodoSchema = z.object({
    text: z.string().min(1).max(512),
    priority: priorityEnum.optional(),
    /** ISO date string ('' → no deadline). */
    dueDate: z.string().optional(),
});

const updateTodoSchema = z.object({
    text: z.string().min(1).max(512).optional(),
    priority: priorityEnum.optional(),
    dueDate: z.string().optional(),
});

const iso = (d: Date | string | null | undefined): string =>
    d instanceof Date ? d.toISOString() : (d ?? '');
type TodoRow = typeof workshopTodos.$inferSelect;

function toDto(row: TodoRow) {
    return {
        id: row.id,
        text: row.text,
        done: row.done,
        priority: row.priority,
        ...(row.dueDate ? { dueDate: iso(row.dueDate) } : { dueDate: '' }),
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
        ...(row.doneAt ? { doneAt: iso(row.doneAt) } : { doneAt: '' }),
        isDeleted: row.isDeleted,
        ...(row.deletedAt ? { deletedAt: iso(row.deletedAt) } : { deletedAt: '' }),
    };
}

export async function listTodos(req: Request, res: Response): Promise<void> {
    const includeDeleted = req.query.includeDeleted === 'true';
    const rows = await svc.listTodos(includeDeleted);
    res.json(rows.map(toDto));
}

export async function createTodo(req: Request, res: Response): Promise<void> {
    const data = createTodoSchema.parse(req.body);
    const row = await svc.createTodo(data);
    logAudit(req.auth ?? null, 'create', 'todo', `کار «${row.text}» به فهرست کارها اضافه شد`, req.ip);
    res.status(201).json(toDto(row));
}

export async function updateTodo(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه کار');
    const data = updateTodoSchema.parse(req.body);
    const row = await svc.updateTodo(id, data);
    logAudit(req.auth ?? null, 'update', 'todo', `کار «${row.text}» ویرایش شد`, req.ip);
    res.json(toDto(row));
}

export async function toggleTodo(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه کار');
    const row = await svc.toggleTodo(id);
    logAudit(
        req.auth ?? null,
        'update',
        'todo',
        row.done ? `کار «${row.text}» انجام شد` : `کار «${row.text}» به حالت انجام‌نشده برگشت`,
        req.ip,
    );
    res.json(toDto(row));
}

export async function clearDoneTodos(req: Request, res: Response): Promise<void> {
    const count = await svc.clearDoneTodos();
    if (count > 0) {
        logAudit(
            req.auth ?? null,
            'delete',
            'todo',
            `${count} کار انجام‌شده از فهرست پاک شد`,
            req.ip,
        );
    }
    res.json({ cleared: count });
}

export async function deleteTodo(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه کار');
    await svc.softDeleteTodo(id);
    logAudit(req.auth ?? null, 'delete', 'todo', 'یک کار از فهرست کارها حذف شد', req.ip);
    res.json({ message: 'کار با موفقیت حذف شد' });
}
