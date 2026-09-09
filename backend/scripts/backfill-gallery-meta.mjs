#!/usr/bin/env node
/**
 * One-off backfill: probe image files on disk (backend/uploads) and fill the
 * gallery_images metadata columns (width, height, file_size, mime_type) for
 * legacy rows uploaded before the columns existed.
 *
 * Plain ESM using only production deps (mysql2, dotenv) — runs under plain
 * `node` on cPanel just like scripts/migrate.js. Idempotent: skips rows that
 * already have metadata.
 *
 * Usage: node scripts/backfill-gallery-meta.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const uploadsDir = path.resolve(__dirname, '../uploads');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'polaris',
    waitForConnections: true,
});

// --- header probing (kept in sync with galleryService.ts, plain JS here) ---

function probeDims(buf, mimeType) {
    // PNG
    if (
        buf.length >= 24 &&
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
        buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    ) {
        return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), mimeType: 'image/png' };
    }
    // GIF
    if (buf.length >= 10 && buf.subarray(0, 4).toString('ascii') === 'GIF8') {
        return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8), mimeType: 'image/gif' };
    }
    // JPEG
    if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
        let offset = 2;
        while (offset + 9 < buf.length) {
            if (buf[offset] !== 0xff) {
                offset++;
                continue;
            }
            const marker = buf[offset + 1];
            const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
            if (isSof) {
                return {
                    width: buf.readUInt16BE(offset + 7),
                    height: buf.readUInt16BE(offset + 5),
                    mimeType: 'image/jpeg',
                };
            }
            const segmentLength = buf.readUInt16BE(offset + 2);
            if (segmentLength <= 0) break;
            offset += 2 + segmentLength;
        }
    }
    // WebP
    if (
        buf.length >= 30 &&
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
        const chunk = buf.subarray(12, 16).toString('ascii');
        if (chunk === 'VP8 ') {
            return {
                width: buf.readUInt16LE(26) & 0x3fff,
                height: buf.readUInt16LE(28) & 0x3fff,
                mimeType: 'image/webp',
            };
        }
        if (chunk === 'VP8L') {
            const bits = (buf[21] | (buf[22] << 8) | (buf[23] << 16) | (buf[24] << 24)) >>> 1;
            return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, mimeType: 'image/webp' };
        }
        if (chunk === 'VP8X') {
            const width = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1;
            const height = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1;
            return { width, height, mimeType: 'image/webp' };
        }
    }
    return { width: null, height: null, mimeType: mimeType || null };
}

function probeFile(filePath) {
    const fileSize = fs.statSync(filePath).size;
    const fd = fs.openSync(filePath, 'r');
    try {
        const header = Buffer.alloc(65536);
        const read = fs.readSync(fd, header, 0, header.length, 0);
        return { ...probeDims(header.subarray(0, read), null), fileSize };
    } finally {
        fs.closeSync(fd);
    }
}

// --- main ---

let updated = 0;
let skipped = 0;
let missing = 0;

try {
    const [rows] = await pool.query(
        'SELECT id, url, file_name, mime_type FROM gallery_images WHERE width IS NULL',
    );

    for (const row of rows) {
        if (!row.url.startsWith('/uploads/')) {
            skipped++; // external URL — index-only, nothing to probe
            continue;
        }
        const filePath = path.join(uploadsDir, path.basename(row.url));
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️  missing file: ${filePath}`);
            missing++;
            continue;
        }
        const meta = probeFile(filePath);
        await pool.query(
            'UPDATE gallery_images SET width = ?, height = ?, file_size = ?, mime_type = ? WHERE id = ?',
            [meta.width, meta.height, meta.fileSize, meta.mimeType, row.id],
        );
        updated++;
    }

    console.log(`\n✅ backfill done — ${updated} updated, ${skipped} external skipped, ${missing} files missing (of ${rows.length} legacy rows)`);
} catch (err) {
    console.error('ERR:', err.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
