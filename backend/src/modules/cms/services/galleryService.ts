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
    alt?: string;
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
    alt: string;
    tags: string[];
    metadata: ImageMetadata;
}): Promise<GalleryImageRow> {
    const id = uuid();
    await db.insert(galleryImages).values({
        id,
        url: input.url,
        fileName: input.fileName,
        category: input.category,
        label: input.label,
        alt: input.alt,
        tags: input.tags,
        width: input.metadata.width,
        height: input.metadata.height,
        fileSize: input.metadata.fileSize,
        mimeType: input.metadata.mimeType,
    });
    return getGalleryImage(id);
}

export async function updateGalleryImage(id: string, patch: GalleryPatch): Promise<GalleryImageRow> {
    await getGalleryImage(id);
    await db
        .update(galleryImages)
        .set({
            ...(patch.category !== undefined ? { category: patch.category } : {}),
            ...(patch.label !== undefined ? { label: patch.label } : {}),
            ...(patch.alt !== undefined ? { alt: patch.alt } : {}),
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

// -------------------------------------------------------------------------
// Image metadata probing (dimensions + byte size from the file itself)
// -------------------------------------------------------------------------

/** Probed facts about an image file, used to fill the gallery index row. */
export interface ImageMetadata {
    width: number | null;
    height: number | null;
    fileSize: number | null;
    mimeType: string | null;
}

/** Reads the first bytes of a local image file and parses width/height. */
export function probeImageMeta(filePath: string, mimeType: string): ImageMetadata {
    const fileSize = fs.statSync(filePath).size;
    const fd = fs.openSync(filePath, 'r');
    try {
        const header = Buffer.alloc(65536);
        const read = fs.readSync(fd, header, 0, header.length, 0);
        return { ...probeDimensions(header.subarray(0, read), mimeType), fileSize };
    } finally {
        fs.closeSync(fd);
    }
}

/** Parses width/height from a file-header slice; nulls when unrecognized. */
function probeDimensions(header: Buffer, mimeType: string): { width: number | null; height: number | null; mimeType: string | null } {
    // PNG: 8-byte signature, then IHDR width/height at offsets 16/20.
    if (header.length >= 24 && header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return { width: header.readUInt32BE(16), height: header.readUInt32BE(20), mimeType: 'image/png' };
    }
    // GIF: "GIF8" signature, then 2-byte little-endian dims at offsets 6/8.
    if (header.length >= 10 && header.subarray(0, 4).toString('ascii') === 'GIF8') {
        return { width: header.readUInt16LE(6), height: header.readUInt16LE(8), mimeType: 'image/gif' };
    }
    // JPEG: walk the marker segments until an SOFn frame header is found.
    if (header.length >= 4 && header[0] === 0xff && header[1] === 0xd8) {
        let offset = 2;
        while (offset + 9 < header.length) {
            if (header[offset] !== 0xff) {
                offset++;
                continue;
            }
            const marker = header[offset + 1] as number;
            const isSof =
                marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
            if (isSof) {
                return {
                    width: header.readUInt16BE(offset + 7),
                    height: header.readUInt16BE(offset + 5),
                    mimeType: 'image/jpeg',
                };
            }
            const segmentLength = header.readUInt16BE(offset + 2);
            if (segmentLength <= 0) break;
            offset += 2 + segmentLength;
        }
    }
    // WebP: "RIFF....WEBP" then VP8/VP8L/VP8X chunk with its own layout.
    if (
        header.length >= 30 &&
        header.subarray(0, 4).toString('ascii') === 'RIFF' &&
        header.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
        const chunk = header.subarray(12, 16).toString('ascii');
        if (chunk === 'VP8 ') {
            // Lossy: frame tag at +20, dims as 14-bit LE values at +26/+28.
            return {
                width: header.readUInt16LE(26) & 0x3fff,
                height: header.readUInt16LE(28) & 0x3fff,
                mimeType: 'image/webp',
            };
        }
        if (chunk === 'VP8L') {
            const b21 = header[21] as number; const b22 = header[22] as number; const b23 = header[23] as number; const b24 = header[24] as number;
            const bits = (b21 | (b22 << 8) | (b23 << 16) | (b24 << 24)) >>> 1;
            return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, mimeType: 'image/webp' };
        }
        if (chunk === 'VP8X') {
            // Extended: 24-bit little-endian packed canvas dims at +24.
            const b24 = header[24] as number; const b25 = header[25] as number; const b26 = header[26] as number;
            const b27 = header[27] as number; const b28 = header[28] as number; const b29 = header[29] as number;
            return {
                width: (b24 | (b25 << 8) | (b26 << 16)) + 1,
                height: (b27 | (b28 << 8) | (b29 << 16)) + 1,
                mimeType: 'image/webp',
            };
        }
    }
    // AVIF: ISO-BMFF; dimensions live in the ispe box — probing needs a
    // full-box walk, so fall back to the declared mime with unknown dims.
    return { width: null, height: null, mimeType: mimeType || null };
}
