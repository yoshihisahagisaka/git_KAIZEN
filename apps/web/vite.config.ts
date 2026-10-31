import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)), plugins: [react()],
  build: { outDir: '../../dist/client', emptyOutDir: true },
  server: { host: 'localhost', port: 5173, strictPort: true, proxy: { '/api': 'http://localhost:8080', '/auth': 'http://localhost:8080' } },
});
