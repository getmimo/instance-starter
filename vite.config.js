import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: path.join(process.cwd(), "client"),
  build: {
    outDir: path.join(process.cwd(), "dist"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    allowedHosts: true,
    hmr: {
      clientPort: 3000,
      // port: 443,
      // host: `carelessly-lumbering-raincoat.mimo.dev`,
      // protocol: 'wss',
        path: "/vite"
      },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/vite": {
        target: "ws://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
