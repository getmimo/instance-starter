import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Example table schema. Modify or remove as needed.
 * This is included as a reference for LLMs to understand the schema structure.
 */
export const examples = sqliteTable('examples', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}); 