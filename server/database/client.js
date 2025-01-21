import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Initialize the database connection
 * @returns {Object} The database client instance
 */
export function initializeDatabase() {
  // Create database connection
  const sqlite = new Database(path.join(__dirname, '../../database.db'));
  const db = drizzle(sqlite);
  return db;
}

/**
 * Run database migrations
 * @param {Object} db - The database client instance
 */
export async function runMigrations(db) {
  try {
    // Run migrations from the 'migrations' folder
    await migrate(db, {
      migrationsFolder: path.join(__dirname, '../../drizzle/migrations'),
    });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}

/**
 * Helper function to handle database errors
 * @param {Function} dbOperation - Database operation to execute
 * @returns {Promise} Resolved with operation result or rejected with error
 */
export async function withErrorHandling(dbOperation) {
  try {
    return await dbOperation();
  } catch (error) {
    console.error('Database operation failed:', error);
    throw new Error('Database operation failed');
  }
} 