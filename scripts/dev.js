import { createServer } from 'vite';
import { startServer } from '../server/index.js';
import { vitePort } from '../vite.config.js';

async function startDev() {
  // Start the Express API server first
  await startServer();

  // Then start Vite in dev mode
  const vite = await createServer({
    configFile: './vite.config.js',
  });

  const x = await vite.listen();
  console.log(`Vite dev server running on port ${vite.config.server.port}`);
}

startDev(); 