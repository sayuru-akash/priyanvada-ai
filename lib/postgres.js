const { Pool } = require("pg");

class PostgresService {
  constructor() {
    if (!process.env.POSTGRES_CONNECTION_STRING && !process.env.DATABASE_URL) {
      throw new Error(
        "PostgreSQL connection string not found. Please set POSTGRES_CONNECTION_STRING or DATABASE_URL in your environment variables."
      );
    }

    this.pool = new Pool({
      connectionString:
        process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased from 2s to 10s
      query_timeout: 15000, // 15 second query timeout
      statement_timeout: 15000, // 15 second statement timeout
      acquireTimeoutMillis: 10000, // 10 second timeout to acquire connection from pool
    });

    this.pool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client", err);
    });

    this.pool.on("connect", (client) => {
      console.log("Connected to PostgreSQL database");
    });
  }

  async query(text, params = []) {
    const start = Date.now();
    let client;
    try {
      client = await this.pool.connect();

      // Set query timeout on the client
      await client.query("SET statement_timeout = 15000"); // 15 seconds

      const result = await client.query(text, params);
      const duration = Date.now() - start;

      if (process.env.NODE_ENV === "development" && duration > 1000) {
        console.log("Slow query detected", {
          text: text.substring(0, 100),
          duration,
          rows: result.rowCount,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error("Database query error:", error.message);
      console.error("Query:", text.substring(0, 200));
      console.error("Params:", params);
      console.error("Duration:", duration + "ms");

      // Re-throw with more context for timeout errors
      if (error.message.includes("timeout") || error.code === "57014") {
        throw new Error(
          `Database query timeout after ${duration}ms: ${error.message}`
        );
      }
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Transaction rolled back due to error:", error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    console.log("Closing PostgreSQL connection pool");
    await this.pool.end();
  }

  // Helper method to test connection
  async testConnection() {
    try {
      const result = await this.query(
        "SELECT NOW() as current_time, version() as pg_version"
      );
      return {
        success: true,
        time: result.rows[0].current_time,
        version: result.rows[0].pg_version,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Helper method to format UUID queries
  formatUuid(id) {
    return id;
  }
}

module.exports = new PostgresService();
