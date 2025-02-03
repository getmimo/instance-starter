import { createServer } from 'vite';
import { startServer } from '../server/index.js';

async function startDev() {
  // Start the Express API server first
  await startServer();

  // Then start Vite in dev mode
  const vite = await createServer({
    configFile: './vite.config.js',
  });

  const x = await vite.listen();
  console.log('Vite dev server running on port 3000');
}

startDev(); 