/**
 * Generic database operations that can be used as templates by LLMs
 * @param {Object} db - The database client instance
 */
export class DatabaseOperations {
  constructor(db) {
    this.db = db;
  }

  /**
   * Generic create operation
   * @param {Object} table - The table to insert into
   * @param {Object} data - The data to insert
   */
  async create(table, data) {
    return await this.db.insert(table).values(data).returning();
  }

  /**
   * Generic read operation
   * @param {Object} table - The table to query
   * @param {Object} where - Where conditions
   */
  async read(table, where = {}) {
    return await this.db.select().from(table).where(where);
  }

  /**
   * Generic update operation
   * @param {Object} table - The table to update
   * @param {Object} where - Where conditions
   * @param {Object} data - The data to update
   */
  async update(table, where, data) {
    return await this.db.update(table).set(data).where(where).returning();
  }

  /**
   * Generic delete operation
   * @param {Object} table - The table to delete from
   * @param {Object} where - Where conditions
   */
  async delete(table, where) {
    return await this.db.delete(table).where(where).returning();
  }
} 