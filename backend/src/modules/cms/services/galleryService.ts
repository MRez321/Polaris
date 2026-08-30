import fs from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

import { db } from '../../../config/drizzle.js';
import { galleryImages } from '../../../schema/index.js';
import type { GalleryImageRow } from '../../../schema/index.js';
import { badRequest, notFound } from '../../../core/utils/apiError.js';

/** Directory uploaded image files are written to; served at /uploads. */
export const uploadsDir = path.join(process.cwd(), 'uploads');

export function ensureUploadsDir(): void {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

export interface GalleryPatch {
    category?: string;
    label?: string;
    tags?: string[];
}

export async function listGallery(): Promise<GalleryImageRow[]> {
    return db.select().from(galleryImages).orderBy(galleryImages.createdAt);
}

export async function getGalleryImage(id: string): Promise<GalleryImageRow> {
    const [row] = await db.select().from(galleryImages).where(eq(galleryImages.id, id));
    if (!row) throw notFound('تصویر موردنظر در گالری یافت نشد');
    return row;
}

export async function recordGalleryImage(input: {
    url: string;
    fileName: string;
    category: string;
    label: string;
    tags: string[];
}): Promise<GalleryImageRow> {
    const id = uuid();
    await db.insert(galleryImages).values({ id, ...input });
    return getGalleryImage(id);
}

export async function updateGalleryImage(id: string, patch: GalleryPatch): Promise<GalleryImageRow> {
    await getGalleryImage(id);
    await db
        .update(galleryImages)
        .set({
            ...(patch.category !== undefined ? { category: patch.category } : {}),
            ...(patch.label !== undefined ? { label: patch.label } : {}),
            ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
        })
        .where(eq(galleryImages.id, id));
    return getGalleryImage(id);
}

/**
 * Deletes the gallery index row and unlinks the backing file — but only for
 * local /uploads files; external URLs are index-only.
 */
export async function deleteGalleryImage(id: string): Promise<void> {
    const row = await getGalleryImage(id);
    await db.delete(galleryImages).where(eq(galleryImages.id, id));

    if (row.url.startsWith('/uploads/')) {
        const filePath = path.join(uploadsDir, path.basename(row.url));
        fs.promises.unlink(filePath).catch((err: unknown) => {
            console.warn(`⚠️ Failed to unlink ${filePath}:`, err);
        });
    }
}

/** Public URL under which express.static serves {@link uploadsDir}. */
export function publicUrlFor(fileName: string): string {
    return `/uploads/${fileName}`;
}

const ALLOWED_MIME = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
]);

const EXT_BY_MIME: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
};

export function validateImageMime(mime: string): void {
    if (!ALLOWED_MIME.has(mime)) throw badRequest('فقط فایل‌های تصویری (JPG، PNG، WebP، GIF) پذیرفته می‌شوند');
}

export function extensionFor(mime: string, originalName: string): string {
    if (EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
    const ext = path.extname(originalName).replace('.', '').toLowerCase();
    if (/^(jpe?g|png|webp|gif|avif)$/.test(ext)) return ext;
    throw badRequest('پسوند فایل تصویر پشتیبانی نمی‌شود');
}

/** Collision-proof on-disk file name for an upload. */
export function storageFileName(mime: string, originalName: string): string {
    return `${Date.now()}-${uuid()}.${extensionFor(mime, originalName)}`;
}
