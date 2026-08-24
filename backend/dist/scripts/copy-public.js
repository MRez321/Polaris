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

// Copy scripts/ folder
const scriptsSrc = join(root, 'scripts');
if (existsSync(scriptsSrc)) {
    cpSync(scriptsSrc, join(dist, 'scripts'), { recursive: true });
    console.log('✅ Copied scripts/ → dist/scripts/');
} else {
    console.warn('⚠️  No scripts/ folder found at project root');
}

// Copy drizzle/ folder
const drizzleSrc = join(root, 'drizzle');
if (existsSync(drizzleSrc)) {
    cpSync(drizzleSrc, join(dist, 'drizzle'), { recursive: true });
    console.log('✅ Copied drizzle/ → dist/drizzle/');
} else {
    console.warn('⚠️  No drizzle/ folder found at project root');
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

// Copy .env.example if it exists (for reference during deployment)
const envExampleSrc = join(root, '.env.example');
if (existsSync(envExampleSrc)) {
    copyFileSync(envExampleSrc, join(dist, '.env.example'));
    console.log('✅ Copied .env.example → dist/.env.example');
}