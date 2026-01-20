/**
 * Build script for Electron preload.
 * Bundles preload.ts into a single file that works in Electron's preload context.
 */

import { build } from 'esbuild';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

async function buildPreload() {
  console.log('[build-preload] Building preload script...');

  try {
    await build({
      entryPoints: [join(projectRoot, 'electron', 'preload.ts')],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'cjs',
      outfile: join(projectRoot, 'dist', 'electron', 'preload.js'),
      external: ['electron'],
      sourcemap: true,
      minify: false,
      treeShaking: true,
    });

    console.log('[build-preload] Preload script built successfully');
  } catch (error) {
    console.error('[build-preload] Build failed:', error);
    process.exit(1);
  }
}

buildPreload();
