export class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = 'ApiError';
    }
}
export const badRequest = (message) => new ApiError(400, message);
export const unauthorized = (message = 'دسترسی غیرمجاز است') => new ApiError(401, message);
export const forbidden = (message = 'شما اجازه انجام این عمل را ندارید') => new ApiError(403, message);
export const notFound = (message = 'مورد درخواستی یافت نشد') => new ApiError(404, message);
export const conflict = (message) => new ApiError(409, message);
/**
 * Reads a route path parameter, rejecting missing/empty/non-string values
 * with a Persian 400. Express 5 types params as `string | string[]`.
 */
export function pathParam(req, name, label) {
    const value = req.params[name];
    if (typeof value !== 'string' || value.length === 0) {
        throw badRequest(`${label} الزامی است`);
    }
    return value;
}
//# sourceMappingURL=apiError.js.map