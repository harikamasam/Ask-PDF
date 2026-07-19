import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: projectRoot,
  cacheDir: 'node_modules/.vite',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    fs: {
      strict: true,
      allow: [projectRoot]
    }
  },
  optimizeDeps: {
    include: ['@vitejs/plugin-react', 'react', 'react-dom/client', 'lucide-react']
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
