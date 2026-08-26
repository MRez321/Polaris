import { z } from 'zod';

/**
 * Client-supplied entity ids are accepted on CREATE endpoints only when they
 * are well-formed UUID v4 strings; otherwise services generate their own.
 */
const CLIENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const clientIdSchema = z.string().regex(CLIENT_ID_PATTERN);

export function isClientId(value: unknown): value is string {
    return typeof value === 'string' && CLIENT_ID_PATTERN.test(value);
}
