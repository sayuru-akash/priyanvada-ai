"use server";

import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin Client
// We use the service role key to bypass RLS and see all users
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

import postgres from "@/lib/postgres";

export async function fetchUsers(
  offset = 0,
  limit = 10,
  search = "",
  sortBy = "created_at",
  order = "desc",
  filters = {}
) {
  try {
    const isStatsSort = [
      "total_chats",
      "total_messages",
      "has_images",
      "image_count",
    ].includes(sortBy);
    const hasImagesFilter =
      filters.hasImages === "true" || filters.hasImages === true;

    // Step 1: Filter Space Reduction (Postgres)
    // If filtering by images, get the candidate IDs first.
    let candidateIds = null;

    if (hasImagesFilter) {
      const { rows } = await postgres.query(`
         SELECT cs.user_id 
         FROM chat_sessions cs 
         JOIN messages m ON cs.id = m.session_id 
         WHERE m.images IS NOT NULL AND m.images != 'null'
         GROUP BY cs.user_id
       `);
      candidateIds = rows.map((r) => r.user_id);
      if (candidateIds.length === 0) return { data: [], count: 0 };
    }

    // Step 2: Query Supabase (Search + User Sort + Pagination Candidate)
    let query = supabaseAdmin.from("users").select("*", { count: "exact" });

    if (candidateIds !== null) {
      query = query.in("id", candidateIds);
    }

    if (search) {
      query = query.or(
        `email.ilike.%${search}%,username.ilike.%${search}%,full_name.ilike.%${search}%`
      );
    }

    // Step 3: Branching Strategy
    let users = [];
    let totalCount = 0;

    if (isStatsSort) {
      // Strategy: Fetch ALL matching profiles (limited by search/filter), then fetch stats, sort via JS, paginate via JS.
      // NOTE: This assumes result set after search/filter fits in memory. For Admin panel, usually acceptable.

      const { data, count, error } = await query; // No range, get all matching
      if (error) throw error;

      let allUsers = data;
      totalCount = count;

      if (allUsers.length > 0) {
        // Fetch stats for all these users
        const ids = allUsers.map((u) => u.id);
        const { rows: stats } = await postgres.query(
          `
            SELECT 
                cs.user_id,
                COUNT(DISTINCT cs.id) as total_chats,
                COUNT(m.id) as total_messages,
                COUNT(CASE WHEN m.images IS NOT NULL AND m.images != 'null' THEN 1 END) as image_count
            FROM chat_sessions cs
            LEFT JOIN messages m ON cs.id = m.session_id
            WHERE cs.user_id = ANY($1::uuid[])
            GROUP BY cs.user_id
        `,
          [ids]
        );

        // Merge Stats
        allUsers = allUsers.map((u) => {
          const stat = stats.find((s) => s.user_id === u.id) || {};
          return {
            ...u,
            total_chats: parseInt(stat.total_chats || 0),
            total_messages: parseInt(stat.total_messages || 0),
            image_count: parseInt(stat.image_count || 0),
            has_images: parseInt(stat.image_count || 0) > 0,
          };
        });

        // Sort JS
        allUsers.sort((a, b) => {
          let valA = a[sortBy] || 0;
          let valB = b[sortBy] || 0;
          if (sortBy === "has_images") {
            // Special bool/count handling
            valA = a.image_count;
            valB = b.image_count;
          }

          return order === "asc" ? valA - valB : valB - valA;
        });

        // Paginate JS
        users = allUsers.slice(offset, offset + limit);
      }
    } else {
      // Strategy: User Sort. Let Supabase handle Sort & Pagination.
      query = query
        .order(sortBy, { ascending: order === "asc" })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) throw error;

      users = data;
      totalCount = count;

      // Fetch stats only for this page
      if (users.length > 0) {
        const ids = users.map((u) => u.id);
        const { rows: stats } = await postgres.query(
          `
            SELECT 
                cs.user_id,
                COUNT(DISTINCT cs.id) as total_chats,
                COUNT(m.id) as total_messages,
                COUNT(CASE WHEN m.images IS NOT NULL AND m.images != 'null' THEN 1 END) as image_count
            FROM chat_sessions cs
            LEFT JOIN messages m ON cs.id = m.session_id
            WHERE cs.user_id = ANY($1::uuid[])
            GROUP BY cs.user_id
          `,
          [ids]
        );

        users = users.map((u) => {
          const stat = stats.find((s) => s.user_id === u.id) || {};
          return {
            ...u,
            total_chats: parseInt(stat.total_chats || 0),
            total_messages: parseInt(stat.total_messages || 0),
            image_count: parseInt(stat.image_count || 0),
            has_images: parseInt(stat.image_count || 0) > 0,
          };
        });
      }
    }

    // Fallback: Check for missing avatars
    const usersMissingAvatar = users.filter((u) => !u.avatar_url);
    if (usersMissingAvatar.length > 0) {
      try {
        await Promise.all(
          usersMissingAvatar.map(async (u) => {
            try {
              const {
                data: { user },
              } = await supabaseAdmin.auth.admin.getUserById(u.id);
              if (user && user.user_metadata) {
                const meta = user.user_metadata;
                const avatar = meta.avatar_url || meta.picture || meta.avatar;
                if (avatar) u.avatar_url = avatar;
              }
            } catch (e) {
              /* Ignore individual user fetch errors */
            }
          })
        );
      } catch (e) {
        console.warn("Failed to fetch auth.users fallback:", e);
      }
    }

    return { data: users, count: totalCount };
  } catch (err) {
    console.error("Server action error:", err);
    return { data: [], count: 0 };
  }
}

export async function exportAllUsers() {
  try {
    // 1. Fetch Users (Limit 10000 for safety)
    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .limit(10000);

    if (error) throw new Error(error.message);
    if (!users || users.length === 0) return { success: true, data: [] };

    // 2. Fetch Stats
    const ids = users.map((u) => u.id);
    const { rows: stats } = await postgres.query(
      `
            SELECT 
                cs.user_id,
                COUNT(DISTINCT cs.id) as total_chats,
                COUNT(m.id) as total_messages,
                COUNT(CASE WHEN m.images IS NOT NULL AND m.images != 'null' THEN 1 END) as image_count,
                MAX(m.timestamp) as last_message_at
            FROM chat_sessions cs
            LEFT JOIN messages m ON cs.id = m.session_id
            WHERE cs.user_id = ANY($1::uuid[])
            GROUP BY cs.user_id
        `,
      [ids]
    );

    // 3. Merge
    const data = users.map((u) => {
      const stat = stats.find((s) => s.user_id === u.id) || {};

      // Handle metadata (view usually has raw_user_meta_data as jsonb)
      let fullName = u.full_name;
      if (!fullName && u.raw_user_meta_data) {
        fullName = u.raw_user_meta_data.full_name || u.raw_user_meta_data.name;
      }

      return {
        id: u.id,
        email: u.email,
        full_name: fullName || "Anonymous",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        total_chats: parseInt(stat.total_chats || 0),
        total_messages: parseInt(stat.total_messages || 0),
        image_count: parseInt(stat.image_count || 0),
        last_message_at: stat.last_message_at || null,
        has_paid_interest: false, // Placeholder
      };
    });

    return { success: true, data };
  } catch (err) {
    console.error("Export users error:", err);
    return { success: false, error: err.message };
  }
}
