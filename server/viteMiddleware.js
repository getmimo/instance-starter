import { createServer } from 'vite';
import { resolve } from 'path';
import fs from 'fs/promises';

export async function setupViteMiddleware(app) {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const template = await fs.readFile(
        resolve(process.cwd(), 'client/index.html'),
        'utf-8'
      );
      
      const transformedHtml = await vite.transformIndexHtml(url, template);
      
      res.status(200).set({ 'Content-Type': 'text/html' }).end(transformedHtml);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
} 