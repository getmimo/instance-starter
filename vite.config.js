import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// Make sure to import the TypeScript error overlay plugin
import tsErrorOverlayPlugin from './config/vite-ts-error-plugin';
// Import our Babel error handler plugin
import { viteBabelErrorPlugin } from './config/vite-babel-error-plugin';

export const vitePort = 3000;

export default defineConfig(() => {
  return {
    plugins: [
      // Add our Babel error handler plugin first (higher priority)
      viteBabelErrorPlugin(),
      // Then the TypeScript error overlay plugin
      tsErrorOverlayPlugin(),
      // Finally the React plugin
      react()
    ].filter(Boolean), // Filter out null plugins
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
  };
});
