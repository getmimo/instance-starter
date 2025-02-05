import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export const vitePort = 3000;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
  root: path.join(process.cwd(), 'client'),
  build: {
    outDir: path.join(process.cwd(), 'dist'),
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: vitePort,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
