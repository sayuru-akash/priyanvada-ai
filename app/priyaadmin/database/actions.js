"use server";

import postgres from "@/lib/postgres";

export async function fetchTables() {
  try {
    const query = `
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const result = await postgres.query(query);

    // Get row counts roughly
    const tables = await Promise.all(
      result.rows.map(async (t) => {
        try {
          const countRes = await postgres.query(
            `SELECT COUNT(*) as cnt FROM "${t.table_name}"`
          );
          return { ...t, row_count: countRes.rows[0].cnt };
        } catch (e) {
          return { ...t, row_count: "?" };
        }
      })
    );

    return { success: true, tables };
  } catch (error) {
    console.error("Error fetching tables:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchTableData(tableName, offset = 0, limit = 10) {
  try {
    // Sanitize tableName significantly to prevent SQL injection since we can't use parameters for identifiers
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error("Invalid table name");
    }

    const countRes = await postgres.query(
      `SELECT COUNT(*) as total FROM "${tableName}"`
    );
    const total = parseInt(countRes.rows[0].total);

    const dataRes = await postgres.query(
      `
      SELECT * FROM "${tableName}"
      LIMIT $1 OFFSET $2
    `,
      [limit, offset]
    );

    // Parse dates to strings to facilitate server->client serialization
    const data = dataRes.rows.map((row) => {
      const newRow = { ...row };
      Object.keys(newRow).forEach((key) => {
        if (newRow[key] instanceof Date) {
          newRow[key] = newRow[key].toISOString();
        }
      });
      return newRow;
    });

    return { success: true, data, total };
  } catch (error) {
    console.error("Error fetching table data:", error);
    return { success: false, error: error.message };
  }
}
