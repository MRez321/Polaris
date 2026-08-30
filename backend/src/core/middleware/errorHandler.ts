import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ApiError } from '../../core/utils/apiError.js';
import { ZodError } from 'zod';

/**
 * Global error handler. Every error is normalized to `{ error: string }`,
 * the exact shape the frontend's `getApiErrorMessage` reads.
 * All user-facing messages are Persian.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof ApiError) {
        res.status(err.status).json({ error: err.message });
        return;
    }

    if (err instanceof ZodError) {
        const first = err.issues[0];
        const path = first?.path.length ? `${first.path.join('.')}: ` : '';
        res.status(400).json({ error: `داده ورودی نامعتبر است. ${path}${first?.message ?? ''}` });
        return;
    }

    // CORS errors and other known HTTP failures
    if (err instanceof Error && err.message === 'Not allowed by CORS') {
        res.status(403).json({ error: 'مبدأ درخواست مجاز نیست' });
        return;
    }

    if (err instanceof MulterError) {
        const message =
            err.code === 'LIMIT_FILE_SIZE'
                ? 'حجم تصویر بیش از حد مجاز است (حداکثر ۸ مگابایت)'
                : 'بارگذاری فایل ناموفق بود';
        res.status(400).json({ error: message });
        return;
    }

    console.error('❌ Unhandled error:', err);
    res.status(500).json({ error: 'خطای داخلی سرور رخ داد' });
}
