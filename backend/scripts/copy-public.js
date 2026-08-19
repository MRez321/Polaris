// scripts/copy-public.js
import { cpSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', 'public');
const dest = join(__dirname, '..', 'dist', 'public');

if (!existsSync(src)) {
    console.warn('⚠️  No public/ folder found at project root');
    process.exit(0);
}

cpSync(src, dest, { recursive: true });
console.log(`✅ Copied public/ → dist/public/`);