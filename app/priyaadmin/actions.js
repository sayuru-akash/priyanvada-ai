"use server";

import { Pool } from "pg";
import dotenv from "dotenv";
import { deleteAdminSession } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function adminLogout() {
  await deleteAdminSession();
}

export async function fetchDashboardStats() {
  try {
    // Parallel fetching: Mix of Supabase and Postgres
    const [
      usersCountRes,
      conversationsRes,
      messagesRes,
      leadsRes,
      allUsersGrowthRes, // Fetching creation dates for JS aggregation
      topCharactersRes,
    ] = await Promise.all([
      // KPI: Total Users (Supabase)
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }),

      // KPI: Chats (PG)
      pool.query("SELECT COUNT(*) FROM chat_sessions"),

      // KPI: Messages (PG)
      pool.query("SELECT COUNT(*) FROM messages"),

      // KPI: Leads (PG)
      pool.query("SELECT COUNT(DISTINCT user_email) FROM paid_plan_interest"),

      // Growth: Fetch creation dates (Supabase)
      supabaseAdmin
        .from("users")
        .select("created_at")
        .gte(
          "created_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        ),

      // Engagement: Top Characters (PG)
      pool.query(`
                SELECT c.name, COUNT(cs.id) as sessions
                FROM characters c
                JOIN chat_sessions cs ON c.id = cs.character_id
                GROUP BY c.name
                ORDER BY sessions DESC
                LIMIT 5
            `),
    ]);

    // Process User Growth (JS Aggregation)
    const growthData = {};
    if (allUsersGrowthRes.data) {
      allUsersGrowthRes.data.forEach((u) => {
        const date = u.created_at.split("T")[0];
        growthData[date] = (growthData[date] || 0) + 1;
      });
    }
    const growthArray = Object.keys(growthData)
      .sort()
      .map((date) => ({ date, count: growthData[date] }));

    return {
      success: true,
      data: {
        totalUsers: usersCountRes.count || 0,
        totalChats: parseInt(conversationsRes.rows[0].count),
        totalMessages: parseInt(messagesRes.rows[0].count),
        totalLeads: parseInt(leadsRes.rows[0].count),
        growth: growthArray,
        topCharacters: topCharactersRes.rows.map((r) => ({
          name: r.name,
          sessions: parseInt(r.sessions),
        })),
      },
    };
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    return { success: false, error: error.message };
  }
}
