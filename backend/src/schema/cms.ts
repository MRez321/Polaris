import { sql } from 'drizzle-orm';
import { mysqlTable, varchar, text, datetime, json, index } from 'drizzle-orm/mysql-core';

// ---------------------------------------------------------------------------
// CMS tables: public marketing-site content (settings, gallery, blog)
// ---------------------------------------------------------------------------

/**
 * Public website settings (marketing site): site title/description and
 * visibility toggles consumed by the public storefront. Products/blog
 * content management is planned for the future and will extend this blob.
 */
export const websiteSettings = mysqlTable('website_settings', {
    id: varchar('id', { length: 36 }).primaryKey(),
    data: json('data').$type<Record<string, unknown>>().notNull(),
    updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Central image library. Every uploaded image lives on disk under /uploads
 * (short URL stored in entity columns) and is indexed here for the Settings
 * gallery: category, free-form tags, optional display label.
 */
export const galleryImages = mysqlTable('gallery_images', {
    id: varchar('id', { length: 36 }).primaryKey(),
    url: varchar('url', { length: 512 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    category: varchar('category', { length: 32 }).notNull().default('general'),
    label: varchar('label', { length: 255 }).notNull().default(''),
    tags: json('tags').$type<string[]>().notNull(),
    createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type GalleryImageRow = typeof galleryImages.$inferSelect;

/** One rendered block of a blog article: optional h2 heading + paragraph. */
export interface BlogPostSection {
    heading?: string;
    text: string;
}

/**
 * Blog articles for the public marketing site. Managed by admin/author roles
 * through the control panel; the storefront reads published posts through
 * /api/public/blog. `date` is a display string (Jalali) set by the author —
 * createdAt stays the canonical timestamp.
 */
export const blogPosts = mysqlTable(
    'blog_posts',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        slug: varchar('slug', { length: 255 }).notNull().unique(),
        title: varchar('title', { length: 512 }).notNull(),
        excerpt: text('excerpt').notNull(),
        image: varchar('image', { length: 512 }).notNull().default(''),
        imageAlt: varchar('image_alt', { length: 255 }).notNull().default(''),
        date: varchar('date', { length: 32 }).notNull().default(''),
        readTime: varchar('read_time', { length: 32 }).notNull().default(''),
        tags: json('tags').$type<string[]>().notNull(),
        body: json('body').$type<BlogPostSection[]>().notNull(),
        status: varchar('status', { length: 16 }).notNull().default('draft'),
        authorId: varchar('author_id', { length: 36 }).notNull().default(''),
        authorName: varchar('author_name', { length: 255 }).notNull().default(''),
        createdAt: datetime('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
        updatedAt: datetime('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    },
    (t) => [index('blog_posts_status_idx').on(t.status)],
);
