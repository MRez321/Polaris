import type { Request, Response } from 'express';
import { z } from 'zod';

import * as svc from './services/blogService.js';
import { recordAudit } from '../../core/services/auditService.js';
import { requestUserAgent } from '../../core/utils/requestMeta.js';
import { pathParam } from '../../core/utils/apiError.js';

const sectionSchema = z.object({
    heading: z.string().optional(),
    text: z.string().min(1),
});

const blogPostSchema = z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
    excerpt: z.string().min(1),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    date: z.string().optional(),
    readTime: z.string().optional(),
    tags: z.array(z.string()).optional(),
    body: z.array(sectionSchema),
    status: z.enum(['draft', 'published']).optional(),
});

/** Admin/author: full list including drafts. */
export async function listPosts(_req: Request, res: Response): Promise<void> {
    res.json(await svc.listPosts(true));
}

export async function createPost(req: Request, res: Response): Promise<void> {
    const data = blogPostSchema.parse(req.body);
    const actor = req.auth!.user;
    const post = await svc.createPost(data, { id: actor.id, name: actor.name });
    recordAudit({
        actor: req.auth ?? null,
        action: 'create',
        entityType: 'settings',
        entityId: post.id,
        details: `مطلب وبلاگ «${post.title}» ایجاد شد`,
        ip: req.ip,
        userAgent: requestUserAgent(req),
    });
    res.status(201).json(post);
}

export async function updatePost(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه مطلب');
    const data = blogPostSchema.partial().parse(req.body);
    const post = await svc.updatePost(id, data);
    recordAudit({
        actor: req.auth ?? null,
        action: 'update',
        entityType: 'settings',
        entityId: post.id,
        details: `مطلب وبلاگ «${post.title}» ویرایش شد`,
        ip: req.ip,
        userAgent: requestUserAgent(req),
    });
    res.json(post);
}

export async function deletePost(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه مطلب');
    const post = await svc.deletePost(id);
    recordAudit({
        actor: req.auth ?? null,
        action: 'delete',
        entityType: 'settings',
        entityId: post.id,
        details: `مطلب وبلاگ «${post.title}» حذف شد`,
        ip: req.ip,
        userAgent: requestUserAgent(req),
    });
    res.json({ message: 'مطلب وبلاگ حذف شد' });
}
