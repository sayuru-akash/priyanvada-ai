"use server";

import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function fetchLeads(params = {}) {
  const {
    search = "",
    orderBy = "submitted_at",
    order = "desc",
    limit = 100,
    page = 0,
  } = params;

  // Validate sort column
  // 'submitted_at' refers to MAX(submitted_at) in the group
  const validSortColumns = [
    "user_name",
    "user_email",
    "budget_range",
    "submission_count",
    "submitted_at",
  ];
  const sortCol = validSortColumns.includes(orderBy) ? orderBy : "submitted_at";
  const sortDir = order === "asc" ? "ASC" : "DESC";

  try {
    let queryArgs = [];
    let whereClauses = ["1=1"];

    if (search) {
      whereClauses.push(`(
        user_name ILIKE $${queryArgs.length + 1} OR 
        user_email ILIKE $${queryArgs.length + 1} OR
        budget_range ILIKE $${queryArgs.length + 1} OR
        current_usage_frequency ILIKE $${queryArgs.length + 1}
      )`);
      queryArgs.push(`%${search}%`);
    }

    const offset = page * limit;

    // Count Unique Emails
    const countQuery = `SELECT COUNT(DISTINCT user_email) as count FROM paid_plan_interest WHERE ${whereClauses.join(
      " AND "
    )}`;
    const countRes = await pool.query(countQuery, queryArgs);
    const total = parseInt(countRes.rows[0].count, 10);

    // Fetch Grouped Data
    // We select the "Latest" details for the main row
    const dataQuery = `
      SELECT 
        user_email,
        MIN(user_name) as user_name, -- Just pick one name
        MAX(submitted_at) as submitted_at,
        MAX(budget_range) as budget_range, -- Approximate latest
        MAX(current_usage_frequency) as current_usage_frequency,
        BOOL_OR(interested_in_paid_plan) as interested_in_paid_plan, -- True if any submission was interested
        COUNT(*) as submission_count,
        json_agg(
            json_build_object(
                'id', id,
                'submitted_at', submitted_at,
                'budget_range', budget_range,
                'current_usage_frequency', current_usage_frequency,
                'interested_in_paid_plan', interested_in_paid_plan,
                'user_agent', user_agent
            ) ORDER BY submitted_at DESC
        ) as history
      FROM paid_plan_interest 
      WHERE ${whereClauses.join(" AND ")}
      GROUP BY user_email
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${queryArgs.length + 1} OFFSET $${queryArgs.length + 2}
    `;

    // Note: ordering by budget_range (MAX) is a bit arbitrary but functional for sortable table requirements.
    // submitted_at (MAX) correctly sorts by latest submission.

    const dataRes = await pool.query(dataQuery, [...queryArgs, limit, offset]);

    // Generate unique ID for the datagrid (use email)
    const rows = dataRes.rows.map((r) => ({ ...r, id: r.user_email }));

    return { success: true, data: rows, total };
  } catch (error) {
    console.error("Error fetching leads:", error);
    return { success: false, error: error.message };
  }
}
