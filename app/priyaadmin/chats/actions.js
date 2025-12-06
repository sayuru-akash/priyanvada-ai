"use server";

import postgres from "@/lib/postgres";
import { createClient } from "@supabase/supabase-js";

// We need to fetch user emails to display them nicely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function fetchChats(
  offset = 0,
  limit = 10,
  filters = {},
  sort = {}
) {
  try {
    const { characterId, userSearch, hasImages } = filters;
    const { orderBy, order } = sort;
    const sortDir = order === "asc" ? "ASC" : "DESC";

    // 1. User Search (Supabase)
    let userIds = null;
    if (userSearch) {
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id")
        .or(`email.ilike.%${userSearch}%,full_name.ilike.%${userSearch}%`)
        .limit(100);

      if (!users || users.length === 0) {
        return { data: [], count: 0 };
      }
      userIds = users.map((u) => u.id);
    }

    // 2. Build Postgres Query Conditions
    let whereConditions = ["1=1"];
    let params = [];
    let paramIdx = 1;

    if (characterId) {
      whereConditions.push(`cs.character_id = $${paramIdx++}`);
      params.push(characterId);
    }

    if (userIds !== null) {
      const placeholders = userIds.map((_, i) => `$${paramIdx + i}`).join(",");
      whereConditions.push(`cs.user_id IN (${placeholders})`);
      params = [...params, ...userIds];
      paramIdx += userIds.length;
    }

    if (hasImages) {
      // Filter by existence of images
      whereConditions.push(
        `(SELECT COUNT(*) FROM messages m WHERE m.session_id = cs.id AND m.images IS NOT NULL AND m.images != 'null') > 0`
      );
    }

    const whereClause = whereConditions.join(" AND ");

    // 3. Count Total (Approximation for performance, or precise?)
    // Precise needed for pagination
    const countQuery = `
        SELECT COUNT(*) as total 
        FROM chat_sessions cs 
        WHERE ${whereClause}
    `;
    // Note: If using just params, ensure indexes match.
    // We reuse 'params' for count query.
    const countRes = await postgres.query(countQuery, params);
    const total = parseInt(countRes.rows[0].total);

    // 4. Main Query
    let orderClause = "cs.updated_at DESC"; // Default
    if (orderBy === "message_count") {
      orderClause = `message_count ${sortDir}`;
    } else if (orderBy === "images_count") {
      orderClause = `images_count ${sortDir}`;
    } else if (orderBy === "updated_at") {
      orderClause = `cs.updated_at ${sortDir}`;
    }

    // We select subqueries for counts to allow sorting by them
    const query = `
      SELECT 
        cs.*,
        c.name as character_name,
        c.avatar_url as character_avatar,
        (SELECT COUNT(*) FROM messages m WHERE m.session_id = cs.id) as message_count,
        (SELECT COUNT(*) FROM messages m WHERE m.session_id = cs.id AND m.images IS NOT NULL AND m.images != 'null') as images_count
      FROM chat_sessions cs
      LEFT JOIN characters c ON cs.character_id = c.id
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    const res = await postgres.query(query, [...params, limit, offset]);
    const chats = res.rows;

    // 5. Fetch User Details for the page results
    const pageUserIds = [...new Set(chats.map((c) => c.user_id))];
    if (pageUserIds.length === 0) return { data: [], count: total };

    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name")
      .in("id", pageUserIds);

    const userMap = {};
    if (users) users.forEach((u) => (userMap[u.id] = u));

    const enrichedChats = chats.map((chat) => {
      const user = userMap[chat.user_id];
      return {
        ...chat,
        user_email: user?.email || "Unknown",
        user_full_name: user?.full_name,
        updated_at: chat.updated_at.toISOString(),
        created_at: chat.created_at.toISOString(),
        // Parse counts to int
        message_count: parseInt(chat.message_count || 0),
        images_count: parseInt(chat.images_count || 0),
      };
    });

    return { data: enrichedChats, count: total };
  } catch (error) {
    console.error("Error fetching chats:", error);
    return { data: [], count: 0 };
  }
}

export async function fetchChatMetadata(chatId) {
  try {
    // Fetch session info with message count
    const sessionRes = await postgres.query(
      `
            SELECT 
                cs.*,
                c.name as character_name,
                c.avatar_url as character_avatar,
                (SELECT COUNT(*) FROM messages WHERE session_id = cs.id) as message_count
            FROM chat_sessions cs
            LEFT JOIN characters c ON cs.character_id = c.id
            WHERE cs.id = $1
        `,
      [chatId]
    );

    if (sessionRes.rows.length === 0)
      return { success: false, error: "Chat not found" };

    const session = sessionRes.rows[0];

    // Fetch user info
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("email, full_name, avatar_url")
      .eq("id", session.user_id)
      .single();

    if (user && !user.avatar_url) {
      try {
        const {
          data: { user: authUser },
        } = await supabaseAdmin.auth.admin.getUserById(session.user_id);
        if (authUser && authUser.user_metadata) {
          const meta = authUser.user_metadata;
          const avatar = meta.avatar_url || meta.picture || meta.avatar;
          if (avatar) user.avatar_url = avatar;
        }
      } catch (ignored) {}
    }

    return {
      success: true,
      data: {
        ...session,
        updated_at: session.updated_at.toISOString(),
        created_at: session.created_at.toISOString(),
        user: user || { email: "Unknown" },
      },
    };
  } catch (e) {
    console.error("Error fetching chat metadata:", e);
    return { success: false, error: e.message };
  }
}

export async function fetchChatMessages(chatId) {
  try {
    const messagesRes = await postgres.query(
      `
            SELECT * FROM messages 
            WHERE session_id = $1 
            ORDER BY timestamp ASC
        `,
      [chatId]
    );

    const messages = messagesRes.rows.map((m) => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    }));

    return { success: true, data: messages };
  } catch (e) {
    console.error("Error fetching chat messages:", e);
    return { success: false, error: e.message };
  }
}
