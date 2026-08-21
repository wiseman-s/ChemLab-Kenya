// scripts/copy-ketcher-assets.mjs
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceDir = join(__dirname, '..', 'node_modules', 'ketcher-react', 'dist');
const targetDir = join(__dirname, '..', 'public', 'ketcher');

// Ensure target directory exists
if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
}

// Copy all files from source to target
function copyDir(src, dest) {
  if (!existsSync(src)) {
    console.error(`❌ Source directory not found: ${src}`);
    console.log('Please make sure ketcher-react is installed.');
    process.exit(1);
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!existsSync(destPath)) {
        mkdirSync(destPath, { recursive: true });
      }
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
      console.log(`✅ Copied: ${entry.name}`);
    }
  }
}

console.log('📦 Copying Ketcher static assets...');
copyDir(sourceDir, targetDir);
console.log('✅ Ketcher assets copied successfully!');