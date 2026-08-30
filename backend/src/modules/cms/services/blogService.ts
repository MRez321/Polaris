import { desc, eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import { db } from '../../../config/drizzle.js';
import { blogPosts } from '../../../schema/index.js';
import type { BlogPost, BlogPostStatus, BlogSection } from '../../../types/index.js';
import { badRequest, conflict, notFound } from '../../../core/utils/apiError.js';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function toBlogPostDto(row: typeof blogPosts.$inferSelect): BlogPost {
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        image: row.image,
        imageAlt: row.imageAlt,
        date: row.date,
        readTime: row.readTime,
        tags: row.tags,
        body: row.body,
        status: row.status as BlogPostStatus,
        authorId: row.authorId,
        authorName: row.authorName,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export async function listPosts(includeDrafts: boolean) {
    const rows = includeDrafts
        ? await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt))
        : await db
              .select()
              .from(blogPosts)
              .where(eq(blogPosts.status, 'published'))
              .orderBy(desc(blogPosts.createdAt));
    return rows.map(toBlogPostDto);
}

export async function getPublishedPostBySlug(slug: string) {
    const rows = await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.slug, slug))
        .limit(1);
    const row = rows[0];
    if (!row || row.status !== 'published') return null;
    return toBlogPostDto(row);
}

export async function getPostById(id: string) {
    const rows = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
    if (!rows[0]) throw notFound('مطلب وبلاگ یافت نشد');
    return rows[0];
}

export interface BlogPostInput {
    slug: string;
    title: string;
    excerpt: string;
    image?: string;
    imageAlt?: string;
    date?: string;
    readTime?: string;
    tags?: string[];
    body: BlogSection[];
    status?: BlogPostStatus;
}

/** Reject duplicate slugs with a readable Persian error. */
async function assertSlugFree(slug: string, exceptId?: string) {
    if (!slugPattern.test(slug)) {
        throw badRequest('آدرس مطلب فقط می‌تواند شامل حروف انگلیسی کوچک، عدد و خط تیره باشد');
    }
    const rows = await db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1);
    if (rows[0] && rows[0].id !== exceptId) {
        throw conflict('این آدرس مطلب قبلا استفاده شده است');
    }
}

export async function createPost(data: BlogPostInput, author: { id: string; name: string }) {
    if (!data.title.trim()) throw badRequest('عنوان مطلب الزامی است');
    if (!data.slug.trim()) throw badRequest('آدرس مطلب الزامی است');
    const slug = data.slug.trim().toLowerCase();
    await assertSlugFree(slug);
    const id = uuid();
    await db.insert(blogPosts).values({
        id,
        slug,
        title: data.title.trim(),
        excerpt: data.excerpt.trim(),
        image: data.image?.trim() ?? '',
        imageAlt: data.imageAlt?.trim() ?? '',
        date: data.date?.trim() ?? '',
        readTime: data.readTime?.trim() ?? '',
        tags: data.tags ?? [],
        body: data.body ?? [],
        status: data.status ?? 'draft',
        authorId: author.id,
        authorName: author.name,
    });
    return toBlogPostDto(await getPostById(id));
}

export async function updatePost(id: string, patch: Partial<BlogPostInput>) {
    const existing = await getPostById(id);
    if (patch.slug !== undefined) {
        const slug = patch.slug.trim().toLowerCase();
        await assertSlugFree(slug, id);
        existing.slug = slug;
    }
    if (patch.title !== undefined) existing.title = patch.title.trim();
    if (patch.excerpt !== undefined) existing.excerpt = patch.excerpt.trim();
    if (patch.image !== undefined) existing.image = patch.image.trim();
    if (patch.date !== undefined) existing.date = patch.date.trim();
    if (patch.readTime !== undefined) existing.readTime = patch.readTime.trim();
    if (patch.tags !== undefined) existing.tags = patch.tags;
    if (patch.body !== undefined) existing.body = patch.body;
    if (patch.status !== undefined) existing.status = patch.status;

    const { id: _id, createdAt: _c, updatedAt: _u, ...fields } = existing;
    await db.update(blogPosts).set({ ...fields, updatedAt: new Date() }).where(eq(blogPosts.id, id));
    return toBlogPostDto(await getPostById(id));
}

export async function deletePost(id: string) {
    const row = await getPostById(id);
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return row;
}
