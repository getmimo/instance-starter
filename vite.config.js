import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// Make sure to import the TypeScript error overlay plugin
import tsErrorOverlayPlugin from './client/src/vite-ts-error-plugin';

export const vitePort = 3000;

export default defineConfig({
  plugins: [
    react(),
    tsErrorOverlayPlugin(),
  ],
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
  clearScreen: false,
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
