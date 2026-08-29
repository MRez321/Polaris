import type { Request, Response } from 'express';
import { z } from 'zod';

import * as svc from '../services/blogService.js';
import { logAudit } from '../services/auditService.js';
import { pathParam } from '../utils/apiError.js';

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
    logAudit(req.auth ?? null, 'create', 'settings', `مطلب وبلاگ «${post.title}» ایجاد شد`, req.ip);
    res.status(201).json(post);
}

export async function updatePost(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه مطلب');
    const data = blogPostSchema.partial().parse(req.body);
    const post = await svc.updatePost(id, data);
    logAudit(req.auth ?? null, 'update', 'settings', `مطلب وبلاگ «${post.title}» ویرایش شد`, req.ip);
    res.json(post);
}

export async function deletePost(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه مطلب');
    const post = await svc.deletePost(id);
    logAudit(req.auth ?? null, 'delete', 'settings', `مطلب وبلاگ «${post.title}» حذف شد`, req.ip);
    res.json({ message: 'مطلب وبلاگ حذف شد' });
}
