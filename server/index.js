import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { setupViteMiddleware } from './viteMiddleware.js';
import { initializeDatabase, runMigrations } from './database/client.js';
import { DatabaseOperations } from './database/operations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;


// The code below is for database usage. Uncomment in case a database is needed.
// Initialize database
// const db = initializeDatabase();
// const dbOps = new DatabaseOperations(db);
// Run migrations
// await runMigrations(db);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Setup Vite middleware in development
if (process.env.NODE_ENV !== 'production') {
  await setupViteMiddleware(app);
} else {
  // Serve static files in production
  app.use(express.static(resolve(__dirname, '../dist')));
  app.get('*', (req, res) => {
    res.sendFile(resolve(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 