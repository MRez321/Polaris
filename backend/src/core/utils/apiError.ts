/**
 * API error with an HTTP status code. Caught by the global error handler,
 * which responds with `{ error: message }` (the shape the frontend reads).
 */
import type { Request } from 'express';

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export const badRequest = (message: string): ApiError => new ApiError(400, message);
export const unauthorized = (message = 'دسترسی غیرمجاز است'): ApiError => new ApiError(401, message);
export const forbidden = (message = 'شما اجازه انجام این عمل را ندارید'): ApiError => new ApiError(403, message);
export const notFound = (message = 'مورد درخواستی یافت نشد'): ApiError => new ApiError(404, message);
export const conflict = (message: string): ApiError => new ApiError(409, message);

/**
 * Reads a route path parameter, rejecting missing/empty/non-string values
 * with a Persian 400. Express 5 types params as `string | string[]`.
 */
export function pathParam(req: Request, name: string, label: string): string {
    const value = req.params[name];
    if (typeof value !== 'string' || value.length === 0) {
        throw badRequest(`${label} الزامی است`);
    }
    return value;
}
