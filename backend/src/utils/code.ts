/**
 * Sequential human-readable code generation per entity prefix.
 * Scans existing codes (including soft-deleted rows, so codes are never reused)
 * and returns the next `PREFIX-<n>`.
 */
export function nextCode(prefix: string, existing: string[]): string {
    let max = 0;
    const re = new RegExp(`^${prefix}-(\\d+)$`);
    for (const code of existing) {
        const m = re.exec(code);
        if (m && m[1] !== undefined) {
            const n = parseInt(m[1], 10);
            if (Number.isFinite(n) && n > max) max = n;
        }
    }
    return `${prefix}-${max + 1}`;
}
