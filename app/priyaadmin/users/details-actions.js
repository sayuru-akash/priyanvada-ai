"use server";

import postgres from "@/lib/postgres";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function fetchUserDetails(userId) {
  try {
    // 1. Fetch User Profile from Supabase
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !user) throw new Error("User not found");

    // Fallback: Check for missing avatar in auth.users
    if (!user.avatar_url) {
      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authUser && authUser.user_metadata) {
          const meta = authUser.user_metadata;
          const avatar = meta.avatar_url || meta.picture || meta.avatar;
          if (avatar) user.avatar_url = avatar;
        }
      } catch (authErr) {
        console.warn("Failed to fetch auth fallback for detail:", authErr);
      }
    }

    // 2. Fetch User Stats from Postgres
    const chatStatsRes = await postgres.query(
      `
        SELECT 
            COUNT(DISTINCT chat_sessions.id) as total_chats,
            COUNT(messages.id) as total_messages
        FROM chat_sessions
        LEFT JOIN messages ON chat_sessions.id = messages.session_id
        WHERE chat_sessions.user_id = $1
    `,
      [userId]
    );

    const stats = chatStatsRes.rows[0];

    // 3. Fetch Recent Chats
    const recentChatsRes = await postgres.query(
      `
        SELECT 
            cs.*,
            c.name as character_name,
            c.avatar_url as character_avatar
        FROM chat_sessions cs
        LEFT JOIN characters c ON cs.character_id = c.id
        WHERE cs.user_id = $1
        ORDER BY cs.updated_at DESC
        LIMIT 5
    `,
      [userId]
    );

    return {
      success: true,
      data: {
        user,
        stats: {
          total_chats: parseInt(stats.total_chats),
          total_messages: parseInt(stats.total_messages),
        },
        recent_chats: recentChatsRes.rows.map((c) => ({
          ...c,
          updated_at: c.updated_at.toISOString(),
          created_at: c.created_at.toISOString(),
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching user details:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchUserChats(userId, offset = 0, limit = 10) {
  try {
    const countRes = await postgres.query(
      `
            SELECT COUNT(*) as total 
            FROM chat_sessions 
            WHERE user_id = $1
        `,
      [userId]
    );

    const total = parseInt(countRes.rows[0].total);

    const query = `
            SELECT 
                cs.*,
                c.name as character_name,
                c.avatar_url as character_avatar,
                (SELECT COUNT(*) FROM messages WHERE session_id = cs.id) as message_count,
                (SELECT EXISTS(SELECT 1 FROM messages WHERE session_id = cs.id AND has_images = true)) as has_images
            FROM chat_sessions cs
            LEFT JOIN characters c ON cs.character_id = c.id
            WHERE cs.user_id = $1
            ORDER BY cs.updated_at DESC
            LIMIT $2 OFFSET $3
        `;

    const res = await postgres.query(query, [userId, limit, offset]);

    const chats = res.rows.map((c) => ({
      ...c,
      updated_at: c.updated_at.toISOString(),
      created_at: c.created_at.toISOString(),
    }));

    return { success: true, data: chats, count: total };
  } catch (error) {
    console.error("Error fetching user chats:", error);
    return { success: false, error: error.message };
  }
}
