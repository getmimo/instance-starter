export default {
  schema: './server/database/schema.js',
  out: './drizzle/migrations',
  driver: 'better-sqlite3',
  dbCredentials: {
    url: './database.db',
  },
}; 