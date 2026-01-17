import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite configuration for Electron renderer process.
 * Configured for React 18+ with hot module replacement.
 */
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../dist/app'),
    emptyOutDir: true,
    sourcemap: true,
    // Target modern browsers (Electron uses Chromium)
    target: 'esnext',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // Allow connections from Electron
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
  // Optimize deps for Electron environment
  optimizeDeps: {
    exclude: ['electron'],
  },
});
