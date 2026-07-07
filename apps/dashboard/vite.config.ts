import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: Vite serves the React app and proxies /api to the Express server on 8787.
// Build: outputs the static SPA to dist-web/, which the Express server serves in production.
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist-web' },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
