// scripts/copy-public.js
import { cpSync, copyFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');

// Copy public/ folder
const publicSrc = join(root, 'public');
if (existsSync(publicSrc)) {
    cpSync(publicSrc, join(dist, 'public'), { recursive: true });
    console.log('✅ Copied public/ → dist/public/');
} else {
    console.warn('⚠️  No public/ folder found at project root');
}

// Copy package.json
const pkgSrc = join(root, 'package.json');
if (existsSync(pkgSrc)) {
    copyFileSync(pkgSrc, join(dist, 'package.json'));
    console.log('✅ Copied package.json → dist/package.json');
} else {
    console.error('❌ package.json not found!');
    process.exit(1);
}