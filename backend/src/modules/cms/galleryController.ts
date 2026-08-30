import type { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';

import {
    deleteGalleryImage,
    listGallery,
    publicUrlFor,
    recordGalleryImage,
    storageFileName,
    updateGalleryImage,
    uploadsDir,
    validateImageMime,
} from './services/galleryService.js';
import { logAudit } from '../../core/services/auditService.js';
import { badRequest, pathParam } from '../../core/utils/apiError.js';

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB per image
const MAX_FILES = 10;

const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadsDir),
        filename: (_req, file, cb) => {
            try {
                cb(null, storageFileName(file.mimetype, file.originalname));
            } catch (err) {
                cb(err as Error, '');
            }
        },
    }),
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
    fileFilter: (_req, file, cb) => {
        try {
            validateImageMime(file.mimetype);
            cb(null, true);
        } catch (err) {
            cb(err as Error);
        }
    },
});

const uploadMetaSchema = z.object({
    category: z.string().max(32).optional(),
    label: z.string().max(255).optional(),
    tags: z.string().optional(), // JSON-encoded string[] form field
});

function parseTags(raw: unknown): string[] {
    if (typeof raw !== 'string' || raw.trim() === '') return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean).slice(0, 20);
    } catch {
        return [];
    }
}

/**
 * POST /api/uploads — multipart image upload(s).
 * Form fields: category?, label?, tags? (JSON array string), files: File[]
 * Returns the created gallery rows (url is a short /uploads/... path).
 */
export async function uploadImages(req: Request, res: Response): Promise<void> {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) throw badRequest('هیچ فایلی برای بارگذاری ارسال نشد');

    const meta = uploadMetaSchema.parse(req.body);
    const category = meta.category?.trim() || 'general';
    const label = meta.label?.trim() || '';
    const tags = parseTags(meta.tags);

    const rows = [];
    for (const file of files) {
        rows.push(
            await recordGalleryImage({
                url: publicUrlFor(file.filename),
                fileName: file.filename,
                category,
                label,
                tags,
            }),
        );
    }

    logAudit(req.auth ?? null, 'create', 'settings', `${rows.length} تصویر به گالری افزوده شد`, req.ip);
    res.status(201).json(rows);
}

export async function listImages(_req: Request, res: Response): Promise<void> {
    res.json(await listGallery());
}

const patchSchema = z.object({
    category: z.string().max(32).optional(),
    label: z.string().max(255).optional(),
    tags: z.array(z.string().max(64)).max(20).optional(),
});

export async function updateImage(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه تصویر');
    const patch = patchSchema.parse(req.body);
    const row = await updateGalleryImage(id, patch);
    logAudit(req.auth ?? null, 'update', 'settings', 'اطلاعات یک تصویر گالری ویرایش شد', req.ip);
    res.json(row);
}

export async function deleteImage(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, 'id', 'شناسه تصویر');
    await deleteGalleryImage(id);
    logAudit(req.auth ?? null, 'delete', 'settings', 'یک تصویر از گالری حذف شد', req.ip);
    res.json({ message: 'تصویر حذف شد' });
}

export const uploadMiddleware = upload.array('files', MAX_FILES);

export { MAX_FILE_SIZE };
