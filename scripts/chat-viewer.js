#!/usr/bin/env node

/**
 * Chat Viewer - User Management and Chat Browser
 * Provides a web interface to browse users, their chat sessions, and view individual conversations
 * Uses hybrid approach: Supabase for users, PostgreSQL for chat data
 */

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const postgres = require("../lib/postgres");

const app = express();
const PORT = process.env.CHAT_VIEWER_PORT || 3002;

// Environment validation
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  process.exit(1);
}

if (
  !process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  console.error(
    "❌ Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
  process.exit(1);
}

if (!process.env.POSTGRES_CONNECTION_STRING && !process.env.DATABASE_URL) {
  console.error(
    "❌ Missing POSTGRES_CONNECTION_STRING or DATABASE_URL in .env.local"
  );
  process.exit(1);
}

console.log("🔧 Environment Configuration:");
console.log(`   • Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
console.log(
  `   • Service Key: ${
    process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Found" : "❌ Missing"
  }`
);
console.log(
  `   • Anon Key: ${
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Found" : "❌ Missing"
  }`
);
console.log(
  `   • PostgreSQL: ${
    process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL
      ? "✅ Found"
      : "❌ Missing"
  }`
);
console.log(`   • Port: ${PORT}`);

// Initialize Supabase client (for users only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "chat-viewer-public")));

// Database connection test
async function testConnection() {
  try {
    console.log("🔍 Testing database connections...");

    // Test Supabase (for users)
    const {
      data: userData,
      error: userError,
      count: userCount,
    } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true });

    if (userError) {
      console.error("❌ Supabase query error:", userError.message);
      return false;
    }

    console.log(
      `✅ Supabase connected successfully - Found ${userCount || 0} users`
    );

    // Test PostgreSQL (for chat data)
    const charactersResult = await postgres.query(
      "SELECT COUNT(*) as count FROM characters WHERE is_active = true"
    );
    const characterCount = charactersResult.rows[0]?.count || 0;
    console.log(`✅ PostgreSQL connected - Found ${characterCount} characters`);

    const sessionsResult = await postgres.query(
      "SELECT COUNT(*) as count FROM chat_sessions"
    );
    const sessionCount = sessionsResult.rows[0]?.count || 0;
    console.log(`✅ Found ${sessionCount} chat sessions`);

    const messagesResult = await postgres.query(
      "SELECT COUNT(*) as count FROM messages"
    );
    const messageCount = messagesResult.rows[0]?.count || 0;
    console.log(`✅ Found ${messageCount} messages`);

    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error(
      "   Please check your .env.local file and ensure both Supabase and PostgreSQL are configured correctly"
    );
    return false;
  }
}

// Utility functions for safe JSON handling
function safeJsonParse(str, fallback = null) {
  try {
    return typeof str === "string" ? JSON.parse(str) : str;
  } catch (e) {
    console.warn("JSON parse error:", e.message);
    return fallback;
  }
}

function sanitizeForJson(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForJson);
  if (typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeForJson(value);
    }
    return sanitized;
  }
  return obj;
}

// API Routes

// Get all users with metadata
app.get("/api/users", async (req, res) => {
  try {
    const {
      search = "",
      sortBy = "last_activity",
      order = "desc",
      limit = 30,
      page = 1,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase.from("users").select(`
        id,
        username,
        email,
        full_name,
        avatar_url,
        last_login,
        created_at,
        updated_at
      `);

    // Add search functionality
    if (search && search.trim()) {
      query = query.or(
        `username.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`
      );
    }

    // For last_activity sorting, we need to get all users first, then sort by PostgreSQL data
    if (sortBy === "last_activity") {
      // Get ALL users (no pagination yet) to calculate last activity
      const { data: allUsers, error } = await query;
      if (error) {
        console.error("Error fetching users:", error.message);
        throw error;
      }

      // Get last activity for each user from PostgreSQL
      const usersWithActivity = await Promise.all(
        (allUsers || []).map(async (user) => {
          try {
            const lastActivityQuery = `
              SELECT MAX(GREATEST(cs.created_at, cs.updated_at, 
                COALESCE((SELECT MAX(timestamp) FROM messages WHERE session_id = cs.id), cs.created_at)
              )) as last_activity
              FROM chat_sessions cs 
              WHERE user_id = $1
            `;
            const activityResult = await postgres.query(lastActivityQuery, [
              user.id,
            ]);
            const lastActivity = activityResult.rows[0]?.last_activity;

            return {
              ...user,
              last_activity: lastActivity,
            };
          } catch (error) {
            console.warn(
              `Error getting activity for user ${user.id}:`,
              error.message
            );
            return {
              ...user,
              last_activity: user.created_at, // fallback to created_at
            };
          }
        })
      );

      // Sort by last_activity in JavaScript
      usersWithActivity.sort((a, b) => {
        const aTime = new Date(a.last_activity || a.created_at);
        const bTime = new Date(b.last_activity || b.created_at);
        return order === "asc" ? aTime - bTime : bTime - aTime;
      });

      // Apply pagination after sorting
      const totalUsers = usersWithActivity.length;
      const paginatedUsers = usersWithActivity.slice(
        offset,
        offset + parseInt(limit)
      );

      // Add metadata for each user
      const usersWithMetadata = await Promise.all(
        paginatedUsers.map(async (user) => {
          // Get session and message counts (keeping existing logic)
          try {
            const sessionQuery = `SELECT COUNT(*) as count FROM chat_sessions WHERE user_id = $1`;
            const sessionResult = await postgres.query(sessionQuery, [user.id]);
            const sessionCount = parseInt(sessionResult.rows[0]?.count || 0);

            const messageQuery = `
              SELECT COUNT(m.*) as count 
              FROM messages m
              INNER JOIN chat_sessions cs ON m.session_id = cs.id
              WHERE cs.user_id = $1
            `;
            const messageResult = await postgres.query(messageQuery, [user.id]);
            const messageCount = parseInt(messageResult.rows[0]?.count || 0);

            return {
              ...user,
              session_count: sessionCount,
              message_count: messageCount,
            };
          } catch (error) {
            console.warn(
              `Error getting metadata for user ${user.id}:`,
              error.message
            );
            return {
              ...user,
              session_count: 0,
              message_count: 0,
            };
          }
        })
      );

      res.json({
        success: true,
        users: usersWithMetadata,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / parseInt(limit)),
          hasNext: offset + parseInt(limit) < totalUsers,
          hasPrev: parseInt(page) > 1,
        },
      });
      return;
    }

    // For non-last_activity sorting, use original Supabase sorting
    query = query.order(sortBy, { ascending: order === "asc" });
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: users, error } = await query;

    if (error) {
      console.error("Error fetching users:", error.message);
      throw error;
    }

    // Get total count for pagination
    let countQuery = supabase
      .from("users")
      .select("*", { count: "exact", head: true });
    if (search && search.trim()) {
      countQuery = countQuery.or(
        `username.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`
      );
    }
    const { count: totalUsers, error: countError } = await countQuery;

    if (countError) {
      console.error("Error counting users:", countError.message);
    }

    console.log(
      `📊 Fetched ${users?.length || 0} users from database (page ${page})`
    );

    if (!users || users.length === 0) {
      res.json({
        success: true,
        users: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalUsers || 0,
          totalPages: Math.ceil((totalUsers || 0) / parseInt(limit)),
          hasNext: false,
          hasPrev: parseInt(page) > 1,
        },
      });
      return;
    }

    // Get chat session counts for each user using PostgreSQL
    const usersWithMetadata = await Promise.all(
      (users || []).map(async (user) => {
        try {
          // Get session count from PostgreSQL
          const sessionQuery = `
            SELECT COUNT(*) as count 
            FROM chat_sessions 
            WHERE user_id = $1
          `;
          const sessionResult = await postgres.query(sessionQuery, [user.id]);
          const sessionCount = parseInt(sessionResult.rows[0]?.count || 0);

          // Get message count from PostgreSQL
          const messageQuery = `
            SELECT COUNT(m.*) as count 
            FROM messages m
            INNER JOIN chat_sessions cs ON m.session_id = cs.id
            WHERE cs.user_id = $1
          `;
          const messageResult = await postgres.query(messageQuery, [user.id]);
          const messageCount = parseInt(messageResult.rows[0]?.count || 0);

          // Get last activity from PostgreSQL
          const activityQuery = `
            SELECT updated_at 
            FROM chat_sessions 
            WHERE user_id = $1 
            ORDER BY updated_at DESC 
            LIMIT 1
          `;
          const activityResult = await postgres.query(activityQuery, [user.id]);
          const lastActivity =
            activityResult.rows[0]?.updated_at?.toISOString() ||
            user.last_login ||
            user.created_at;

          return sanitizeForJson({
            ...user,
            session_count: sessionCount,
            message_count: messageCount,
            last_activity: lastActivity,
          });
        } catch (error) {
          console.warn(
            `Error fetching metadata for user ${user.id}:`,
            error.message
          );
          return sanitizeForJson({
            ...user,
            session_count: 0,
            message_count: 0,
            last_activity: user.last_login || user.created_at,
          });
        }
      })
    );

    res.json({
      success: true,
      users: usersWithMetadata,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalUsers || 0,
        totalPages: Math.ceil((totalUsers || 0) / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < (totalUsers || 0),
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error in users API:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    res.status(500).json({
      success: false,
      error: error.message,
      debug: {
        code: error.code,
        details: error.details,
      },
    });
  }
});

// Get chat sessions for a specific user
app.get("/api/users/:userId/sessions", async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 25,
      sortBy = "updated_at",
      order = "desc",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get user info first from Supabase
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("username, email, full_name")
      .eq("id", userId)
      .single();

    if (userError) throw new Error("User not found");

    // Get sessions with character info using PostgreSQL
    let sessionsQuery = `
      SELECT 
        cs.*,
        c.name as character_name,
        c.avatar_url as character_avatar,
        c.title as character_title,
        (SELECT COUNT(*) FROM messages WHERE session_id = cs.id) as message_count
      FROM chat_sessions cs
      INNER JOIN characters c ON cs.character_id = c.id
      WHERE cs.user_id = $1
    `;

    const queryParams = [userId];
    let paramCount = 2;

    // Add sorting
    if (sortBy === "created_at") {
      sessionsQuery += ` ORDER BY cs.created_at ${order.toUpperCase()}`;
    } else if (sortBy === "updated_at") {
      sessionsQuery += ` ORDER BY cs.updated_at ${order.toUpperCase()}`;
    } else if (sortBy === "title") {
      sessionsQuery += ` ORDER BY cs.title ${order.toUpperCase()}`;
    } else {
      sessionsQuery += ` ORDER BY cs.updated_at DESC`;
    }

    // Add pagination
    sessionsQuery += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(parseInt(limit), offset);

    const sessionsResult = await postgres.query(sessionsQuery, queryParams);
    const sessions = sessionsResult.rows || [];

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM chat_sessions WHERE user_id = $1`;
    const countResult = await postgres.query(countQuery, [userId]);
    const totalCount = parseInt(countResult.rows[0]?.total || 0);

    // Get last message for each session
    const sessionsWithLastMessage = await Promise.all(
      sessions.map(async (session) => {
        try {
          const lastMessageQuery = `
            SELECT role, content, timestamp 
            FROM messages 
            WHERE session_id = $1 
            ORDER BY timestamp DESC 
            LIMIT 1
          `;
          const messageResult = await postgres.query(lastMessageQuery, [
            session.id,
          ]);
          const lastMessage = messageResult.rows[0] || null;

          return sanitizeForJson({
            ...session,
            created_at: session.created_at
              ? session.created_at.toISOString()
              : null,
            updated_at: session.updated_at
              ? session.updated_at.toISOString()
              : null,
            last_message: lastMessage
              ? {
                  ...lastMessage,
                  timestamp: lastMessage.timestamp
                    ? lastMessage.timestamp.toISOString()
                    : null,
                }
              : null,
          });
        } catch (error) {
          console.warn(
            `Error fetching last message for session ${session.id}:`,
            error.message
          );
          return sanitizeForJson(session);
        }
      })
    );

    res.json({
      success: true,
      user: sanitizeForJson(user),
      sessions: sessionsWithLastMessage,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        hasNext: parseInt(page) < Math.ceil(totalCount / parseInt(limit)),
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get messages for a specific chat session
app.get("/api/sessions/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    // Get session info using PostgreSQL
    const sessionQuery = `
      SELECT 
        cs.*,
        c.name as character_name,
        c.avatar_url as character_avatar,
        c.title as character_title,
        c.description as character_description
      FROM chat_sessions cs
      INNER JOIN characters c ON cs.character_id = c.id
      WHERE cs.id = $1
    `;
    const sessionResult = await postgres.query(sessionQuery, [sessionId]);
    const session = sessionResult.rows[0];

    if (!session) throw new Error("Session not found");

    // Get user info from Supabase
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("username, email, full_name")
      .eq("id", session.user_id)
      .single();

    if (userError && userError.code !== "PGRST116") {
      console.warn("User not found in Supabase:", userError.message);
    }

    // Get messages for this session from PostgreSQL
    const messagesQuery = `
      SELECT 
        id,
        role,
        content,
        token_count,
        metadata,
        timestamp
      FROM messages 
      WHERE session_id = $1 
      ORDER BY timestamp ASC 
      LIMIT $2 OFFSET $3
    `;
    const messagesResult = await postgres.query(messagesQuery, [
      sessionId,
      parseInt(limit),
      parseInt(offset),
    ]);
    const messages = messagesResult.rows || [];

    // Get total message count
    const countQuery = `SELECT COUNT(*) as total FROM messages WHERE session_id = $1`;
    const countResult = await postgres.query(countQuery, [sessionId]);
    const totalMessages = parseInt(countResult.rows[0]?.total || 0);

    // Process messages and parse metadata safely
    const processedMessages = (messages || []).map((message) => {
      const processed = {
        ...message,
        timestamp: message.timestamp ? message.timestamp.toISOString() : null,
        metadata: safeJsonParse(message.metadata),
      };
      return sanitizeForJson(processed);
    });

    res.json({
      success: true,
      session: sanitizeForJson({
        ...session,
        created_at: session.created_at
          ? session.created_at.toISOString()
          : null,
        updated_at: session.updated_at
          ? session.updated_at.toISOString()
          : null,
        user_name: user?.username || "Unknown User",
        user_email: user?.email,
        user_full_name: user?.full_name,
      }),
      messages: processedMessages,
      total_messages: totalMessages,
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
        has_more: parseInt(offset) + parseInt(limit) < totalMessages,
      },
    });
  } catch (error) {
    console.error("Error fetching session messages:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get chat statistics
app.get("/api/stats", async (req, res) => {
  try {
    // Get user counts from Supabase
    const { count: userCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    // Get other counts from PostgreSQL
    const [charactersResult, sessionsResult, messagesResult] =
      await Promise.all([
        postgres.query(
          "SELECT COUNT(*) as count FROM characters WHERE is_active = true"
        ),
        postgres.query("SELECT COUNT(*) as count FROM chat_sessions"),
        postgres.query("SELECT COUNT(*) as count FROM messages"),
      ]);

    const characterCount = parseInt(charactersResult.rows[0]?.count || 0);
    const sessionCount = parseInt(sessionsResult.rows[0]?.count || 0);
    const messageCount = parseInt(messagesResult.rows[0]?.count || 0);

    // Get recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Recent users from Supabase
    const { count: recentUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday);

    // Recent data from PostgreSQL
    const [recentSessionsResult, recentMessagesResult] = await Promise.all([
      postgres.query(
        "SELECT COUNT(*) as count FROM chat_sessions WHERE created_at >= $1",
        [yesterday]
      ),
      postgres.query(
        "SELECT COUNT(*) as count FROM messages WHERE timestamp >= $1",
        [yesterday]
      ),
    ]);

    const recentSessionCount = parseInt(
      recentSessionsResult.rows[0]?.count || 0
    );
    const recentMessageCount = parseInt(
      recentMessagesResult.rows[0]?.count || 0
    );

    res.json({
      success: true,
      stats: sanitizeForJson({
        totals: {
          users: userCount || 0,
          sessions: sessionCount,
          messages: messageCount,
          characters: characterCount,
        },
        recent_24h: {
          new_users: recentUsers || 0,
          new_sessions: recentSessionCount,
          new_messages: recentMessageCount,
        },
      }),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Serve the main HTML page
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Viewer - Priyanvada AI</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f7fa;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            margin-bottom: 2rem;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.05);
            text-align: center;
            border: 1px solid #e5e7eb;
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 0.5rem;
        }
        
        .stat-label {
            color: #6b7280;
            font-size: 0.875rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .loading {
            text-align: center;
            padding: 3rem;
            color: #6b7280;
            font-size: 1.1rem;
        }
        
        .spinner {
            display: inline-block;
            width: 24px;
            height: 24px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 0.5rem;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .error {
            background: #fef2f2;
            color: #dc2626;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
            border: 1px solid #fecaca;
        }
        
        .view {
            display: none;
        }
        
        .view.active {
            display: block;
        }
        
        .controls {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 16px rgba(0,0,0,0.05);
            border: 1px solid #e5e7eb;
        }
        
        .controls-row {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            align-items: center;
        }
        
        .search-box, .select-box {
            padding: 0.75rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 0.875rem;
            transition: border-color 0.2s;
            background: white;
        }
        
        .search-box:focus, .select-box:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .search-box {
            min-width: 250px;
        }
        
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.2s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .btn-primary {
            background: #667eea;
            color: white;
        }
        
        .btn-primary:hover {
            background: #5a6fd8;
            transform: translateY(-1px);
        }
        
        .btn-secondary {
            background: #6b7280;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #4b5563;
        }
        
        .users-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 1.5rem;
        }
        
        .user-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 16px rgba(0,0,0,0.05);
            border: 1px solid #e5e7eb;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
            overflow: hidden;
        }
        
        .user-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            border-color: #667eea;
        }
        
        .user-header {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .user-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea, #764ba2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 1.2rem;
            margin-right: 1rem;
        }
        
        .user-info h3 {
            color: #1f2937;
            font-weight: 600;
            margin-bottom: 0.25rem;
        }
        
        .user-info p {
            color: #6b7280;
            font-size: 0.875rem;
        }
        
        .user-stats {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .user-stat {
            text-align: center;
            flex: 1;
            padding: 0.5rem;
            background: #f9fafb;
            border-radius: 8px;
        }
        
        .user-stat-number {
            font-weight: 600;
            color: #667eea;
            font-size: 1.1rem;
        }
        
        .user-stat-label {
            font-size: 0.75rem;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .sessions-list {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0,0,0,0.05);
            border: 1px solid #e5e7eb;
        }
        
        .session-item {
            padding: 1.5rem;
            border-bottom: 1px solid #f3f4f6;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }
        
        .session-item:last-child {
            border-bottom: none;
        }
        
        .session-item:hover {
            background: #f8fafc;
        }
        
        .session-header {
            display: flex;
            align-items: center;
            margin-bottom: 0.75rem;
        }
        
        .character-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #667eea;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 500;
            margin-right: 1rem;
            flex-shrink: 0;
        }
        
        .session-info h4 {
            color: #1f2937;
            font-weight: 600;
            margin-bottom: 0.25rem;
        }
        
        .session-meta {
            color: #6b7280;
            font-size: 0.875rem;
        }
        
        .session-preview {
            color: #4b5563;
            font-size: 0.875rem;
            line-height: 1.4;
            margin-top: 0.5rem;
            font-style: italic;
        }
        
        /* Status indicators */
        .session-meta span[style*="color: #dc2626"] {
            background: #fef2f2;
            padding: 0.125rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            border: 1px solid #fecaca;
        }
        
        .session-meta span[style*="color: #059669"] {
            background: #f0fdf4;
            padding: 0.125rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            border: 1px solid #bbf7d0;
        }
        
        .session-stats {
            position: absolute;
            right: 1.5rem;
            top: 1.5rem;
            text-align: right;
        }
        
        .message-count {
            color: #667eea;
            font-weight: 600;
            font-size: 0.875rem;
        }
        
        .last-activity {
            color: #9ca3af;
            font-size: 0.75rem;
        }
        
        .chat-container {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0,0,0,0.05);
            border: 1px solid #e5e7eb;
            min-height: 60vh;
            display: flex;
            flex-direction: column;
        }
        
        .chat-header {
            background: #f8fafc;
            padding: 1.5rem;
            border-bottom: 1px solid #e5e7eb;
        }
        
        /* Chat header status indicators */
        .chat-header span[style*="color: #dc2626"] {
            background: #fef2f2;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            border: 1px solid #fecaca;
            margin-left: 0.5rem;
        }
        
        .chat-header span[style*="color: #059669"] {
            background: #f0fdf4;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            border: 1px solid #bbf7d0;
            margin-left: 0.5rem;
        }
        
        .chat-messages {
            flex: 1;
            padding: 1rem;
            overflow-y: auto;
            max-height: 70vh;
        }
        
        .message {
            margin-bottom: 1.5rem;
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
        }
        
        .message.user {
            flex-direction: row-reverse;
        }
        
        .message-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 500;
            font-size: 0.875rem;
            flex-shrink: 0;
        }
        
        .message.user .message-avatar {
            background: #667eea;
        }
        
        .message.assistant .message-avatar {
            background: #10b981;
        }
        
        .message-content {
            flex: 1;
            max-width: 70%;
        }
        
        .message-bubble {
            padding: 0.75rem 1rem;
            border-radius: 12px;
            line-height: 1.5;
            word-wrap: break-word;
        }
        
        .message.user .message-bubble {
            background: #667eea;
            color: white;
            border-bottom-right-radius: 4px;
        }
        
        .message.assistant .message-bubble {
            background: #f3f4f6;
            color: #1f2937;
            border-bottom-left-radius: 4px;
        }
        
        .message-timestamp {
            font-size: 0.75rem;
            color: #9ca3af;
            margin-top: 0.5rem;
            text-align: right;
        }
        
        .message.user .message-timestamp {
            text-align: left;
        }
        
        .pagination {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            background: #f8fafc;
            border-top: 1px solid #e5e7eb;
        }
        
        .pagination-info {
            color: #6b7280;
            font-size: 0.875rem;
        }
        
        .pagination-controls {
            display: flex;
            gap: 0.5rem;
        }
        
        .pagination-btn {
            padding: 0.5rem 1rem;
            border: 1px solid #d1d5db;
            background: white;
            cursor: pointer;
            border-radius: 6px;
            font-size: 0.875rem;
            transition: all 0.2s;
        }
        
        .pagination-btn:hover:not(:disabled) {
            background: #f3f4f6;
            border-color: #667eea;
        }
        
        .pagination-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .pagination-btn.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        
        .breadcrumb {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            color: #6b7280;
            font-size: 0.875rem;
        }
        
        .breadcrumb a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }
        
        .breadcrumb a:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .users-grid {
                grid-template-columns: 1fr;
            }
            
            .controls-row {
                flex-direction: column;
                align-items: stretch;
            }
            
            .search-box {
                min-width: auto;
            }
            
            .user-stats {
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .session-stats {
                position: static;
                margin-top: 1rem;
                text-align: left;
            }
            
            .message-content {
                max-width: 85%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💬 Chat Viewer</h1>
            <p>Browse users, chat sessions, and view conversations</p>
        </div>
        
        <div id="stats-section">
            <div class="loading">
                <div class="spinner"></div> Loading statistics...
            </div>
        </div>
        
        <div id="users-view" class="view active">
            <div class="controls">
                <div class="controls-row">
                    <input type="text" id="user-search" class="search-box" placeholder="Search users by name, email, or username...">
                    <select id="user-sort" class="select-box">
                        <option value="created_at">Sort by Join Date</option>
                        <option value="last_login">Sort by Last Login</option>
                        <option value="username">Sort by Username</option>
                        <option value="last_activity" selected>Sort by Last Activity</option>
                    </select>
                    <select id="user-order" class="select-box">
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                    </select>
                    <button id="search-users-btn" class="btn btn-primary">🔍 Search</button>
                </div>
            </div>
            
            <div id="users-content">
                <div class="loading">
                    <div class="spinner"></div> Loading users...
                </div>
            </div>
            
            <div id="users-pagination" class="pagination" style="display: none;">
                <div class="pagination-info">
                    <span id="users-pagination-info"></span>
                </div>
                <div class="pagination-controls">
                    <button id="users-first-btn" class="pagination-btn">First</button>
                    <button id="users-prev-btn" class="pagination-btn">Previous</button>
                    <div id="users-page-numbers"></div>
                    <button id="users-next-btn" class="pagination-btn">Next</button>
                    <button id="users-last-btn" class="pagination-btn">Last</button>
                </div>
            </div>
        </div>
        
        <div id="sessions-view" class="view">
            <div class="breadcrumb">
                <a href="#" onclick="showUsersView()">👥 Users</a>
                <span>›</span>
                <span id="current-user-name">User Sessions</span>
            </div>
            
            <div class="controls">
                <div class="controls-row">
                    <button onclick="showUsersView()" class="btn btn-secondary">← Back to Users</button>
                    <select id="session-sort" class="select-box">
                        <option value="updated_at">Sort by Last Activity</option>
                        <option value="created_at">Sort by Created Date</option>
                        <option value="title">Sort by Title</option>
                    </select>
                    <select id="session-order" class="select-box">
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                    </select>
                </div>
            </div>
            
            <div id="sessions-content">
                <div class="loading">
                    <div class="spinner"></div> Loading sessions...
                </div>
            </div>
        </div>
        
        <div id="chat-view" class="view">
            <div class="breadcrumb">
                <a href="#" onclick="showUsersView()">👥 Users</a>
                <span>›</span>
                <a href="#" onclick="showSessionsView()"><span id="breadcrumb-user-name">User</span></a>
                <span>›</span>
                <span id="breadcrumb-chat-title">Chat</span>
            </div>
            
            <div class="controls">
                <div class="controls-row">
                    <button onclick="showSessionsView()" class="btn btn-secondary">← Back to Sessions</button>
                    <div style="flex: 1;"></div>
                    <span id="message-info" class="text-sm text-gray-600"></span>
                </div>
            </div>
            
            <div id="chat-content">
                <div class="loading">
                    <div class="spinner"></div> Loading messages...
                </div>
            </div>
        </div>
    </div>

    <script>
        // Global state
        let currentUser = null;
        let currentSession = null;
        let allUsers = [];
        let allSessions = [];
        let currentUserPage = 1;
        let currentSessionPage = 1;
        let currentlyViewingUserId = null;
        let usersPagination = null;
        
        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            loadStats();
            loadUsers();
            setupEventListeners();
        });
        
        function setupEventListeners() {
            document.getElementById('search-users-btn').addEventListener('click', () => {
                currentUserPage = 1;
                searchUsers();
            });
            document.getElementById('user-search').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    currentUserPage = 1;
                    searchUsers();
                }
            });
            
            // Pagination event listeners
            document.getElementById('users-first-btn').addEventListener('click', () => {
                currentUserPage = 1;
                loadUsers();
            });
            document.getElementById('users-prev-btn').addEventListener('click', () => {
                if (currentUserPage > 1) {
                    currentUserPage--;
                    loadUsers();
                }
            });
            document.getElementById('users-next-btn').addEventListener('click', () => {
                if (usersPagination && usersPagination.hasNext) {
                    currentUserPage++;
                    loadUsers();
                }
            });
            document.getElementById('users-last-btn').addEventListener('click', () => {
                if (usersPagination) {
                    currentUserPage = usersPagination.totalPages;
                    loadUsers();
                }
            });
            
            // Add event listeners for user sort dropdowns
            document.getElementById('user-sort').addEventListener('change', () => {
                currentUserPage = 1; // Reset to first page when sorting changes
                loadUsers();
            });
            
            document.getElementById('user-order').addEventListener('change', () => {
                currentUserPage = 1; // Reset to first page when sorting changes
                loadUsers();
            });
            
            // Add event listeners for session sort dropdowns
            document.getElementById('session-sort').addEventListener('change', () => {
                const userId = currentlyViewingUserId;
                if (userId && currentUser) {
                    currentSessionPage = 1; // Reset to first page when sorting changes
                    showUserSessions(userId, currentUser.username);
                }
            });
            
            document.getElementById('session-order').addEventListener('change', () => {
                const userId = currentlyViewingUserId;
                if (userId && currentUser) {
                    currentSessionPage = 1; // Reset to first page when sorting changes
                    showUserSessions(userId, currentUser.username);
                }
            });
        }
        
        // Safe JSON handling
        function safeJsonParse(str, fallback = null) {
            try {
                return typeof str === 'string' ? JSON.parse(str) : str;
            } catch (e) {
                console.warn('JSON parse error:', e.message);
                return fallback;
            }
        }
        
        function handleApiError(error, fallback = {}) {
            console.error('API Error:', error);
            return fallback;
        }
        
        // Load statistics
        async function loadStats() {
            const statsSection = document.getElementById('stats-section');
            
            try {
                const response = await fetch('/api/stats');
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                
                const stats = result.stats;
                statsSection.innerHTML = \`
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-number">\${stats.totals.users}</div>
                            <div class="stat-label">Total Users</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">\${stats.totals.sessions}</div>
                            <div class="stat-label">Chat Sessions</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">\${stats.totals.messages}</div>
                            <div class="stat-label">Total Messages</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">\${stats.totals.characters}</div>
                            <div class="stat-label">Characters</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">\${stats.recent_24h.new_users}</div>
                            <div class="stat-label">New Users (24h)</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">\${stats.recent_24h.new_messages}</div>
                            <div class="stat-label">Messages (24h)</div>
                        </div>
                    </div>
                \`;
            } catch (error) {
                console.error('Error loading stats:', error);
                statsSection.innerHTML = \`<div class="error">Error loading statistics: \${error.message}</div>\`;
            }
        }
        
        // Load users
        async function loadUsers() {
            const usersContent = document.getElementById('users-content');
            const usersPaginationEl = document.getElementById('users-pagination');
            
            try {
                const search = document.getElementById('user-search').value;
                const sortBy = document.getElementById('user-sort').value;
                const order = document.getElementById('user-order').value;
                
                const params = new URLSearchParams({
                    search,
                    sortBy,
                    order,
                    limit: 30,
                    page: currentUserPage
                });
                
                const response = await fetch(\`/api/users?\${params}\`);
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                
                allUsers = result.users || [];
                usersPagination = result.pagination;
                renderUsers(allUsers);
                renderUsersPagination();
                
            } catch (error) {
                console.error('Error loading users:', error);
                usersContent.innerHTML = \`<div class="error">Error loading users: \${error.message}</div>\`;
                usersPaginationEl.style.display = 'none';
            }
        }
        
        function renderUsers(users) {
            const usersContent = document.getElementById('users-content');
            
            if (users.length === 0) {
                usersContent.innerHTML = '<div class="loading">No users found.</div>';
                return;
            }
            
            const usersHtml = \`
                <div class="users-grid">
                    \${users.map(user => \`
                        <div class="user-card" onclick="showUserSessions('\${user.id}', '\${user.username || 'Unknown'}')">
                            <div class="user-header">
                                <div class="user-avatar">
                                    \${user.avatar_url ? 
                                        \`<img src="\${user.avatar_url}" alt="\${user.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">\` : 
                                        (user.username ? user.username.charAt(0).toUpperCase() : 'U')
                                    }
                                </div>
                                <div class="user-info">
                                    <h3>\${user.username || 'Unknown'}</h3>
                                    <p>\${user.email || user.full_name || 'No email provided'}</p>
                                </div>
                            </div>
                            <div class="user-stats">
                                <div class="user-stat">
                                    <div class="user-stat-number">\${user.session_count}</div>
                                    <div class="user-stat-label">Sessions</div>
                                </div>
                                <div class="user-stat">
                                    <div class="user-stat-number">\${user.message_count}</div>
                                    <div class="user-stat-label">Messages</div>
                                </div>
                                <div class="user-stat">
                                    <div class="user-stat-number">\${formatRelativeTime(user.last_activity)}</div>
                                    <div class="user-stat-label">Last Active</div>
                                </div>
                            </div>
                        </div>
                    \`).join('')}
                </div>
            \`;
            
            usersContent.innerHTML = usersHtml;
        }
        
        function searchUsers() {
            currentUserPage = 1;
            loadUsers();
        }
        
        function renderUsersPagination() {
            const paginationEl = document.getElementById('users-pagination');
            const paginationInfo = document.getElementById('users-pagination-info');
            const pageNumbers = document.getElementById('users-page-numbers');
            
            if (!usersPagination || usersPagination.totalPages <= 1) {
                paginationEl.style.display = 'none';
                return;
            }
            
            paginationEl.style.display = 'flex';
            
            const start = (usersPagination.page - 1) * usersPagination.limit + 1;
            const end = Math.min(usersPagination.page * usersPagination.limit, usersPagination.total);
            
            paginationInfo.textContent = \`Showing \${start} to \${end} of \${usersPagination.total} users\`;
            
            // Update button states
            document.getElementById('users-first-btn').disabled = !usersPagination.hasPrev;
            document.getElementById('users-prev-btn').disabled = !usersPagination.hasPrev;
            document.getElementById('users-next-btn').disabled = !usersPagination.hasNext;
            document.getElementById('users-last-btn').disabled = !usersPagination.hasNext;
            
            // Generate page numbers
            const pages = generatePageNumbers(usersPagination);
            pageNumbers.innerHTML = pages.map(page => {
                if (typeof page === 'number') {
                    return \`<button class="pagination-btn \${page === usersPagination.page ? 'active' : ''}" onclick="goToUserPage(\${page})">\${page}</button>\`;
                } else {
                    return \`<span class="pagination-btn">...</span>\`;
                }
            }).join('');
        }
        
        function goToUserPage(page) {
            currentUserPage = page;
            loadUsers();
        }
        
        function generatePageNumbers(pagination) {
            const pages = [];
            const current = pagination.page;
            const total = pagination.totalPages;
            
            if (total <= 7) {
                for (let i = 1; i <= total; i++) {
                    pages.push(i);
                }
            } else {
                if (current <= 4) {
                    for (let i = 1; i <= 5; i++) pages.push(i);
                    pages.push('...');
                    pages.push(total);
                } else if (current >= total - 3) {
                    pages.push(1);
                    pages.push('...');
                    for (let i = total - 4; i <= total; i++) pages.push(i);
                } else {
                    pages.push(1);
                    pages.push('...');
                    for (let i = current - 1; i <= current + 1; i++) pages.push(i);
                    pages.push('...');
                    pages.push(total);
                }
            }
            
            return pages;
        }
        
        // Show user sessions
        async function showUserSessions(userId, username) {
            currentUser = { id: userId, username: username };
            currentlyViewingUserId = userId; // Track currently viewing user for sort changes
            
            document.getElementById('current-user-name').textContent = username;
            document.getElementById('breadcrumb-user-name').textContent = username;
            
            showView('sessions-view');
            
            const sessionsContent = document.getElementById('sessions-content');
            sessionsContent.innerHTML = '<div class="loading"><div class="spinner"></div> Loading sessions...</div>';
            
            try {
                const sortBy = document.getElementById('session-sort').value;
                const order = document.getElementById('session-order').value;
                
                const params = new URLSearchParams({
                    page: currentSessionPage,
                    sortBy,
                    order,
                    limit: 25
                });
                
                const response = await fetch(\`/api/users/\${userId}/sessions?\${params}\`);
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                
                allSessions = result.sessions || [];
                renderSessions(allSessions, result.user);
                
            } catch (error) {
                console.error('Error loading sessions:', error);
                sessionsContent.innerHTML = \`<div class="error">Error loading sessions: \${error.message}</div>\`;
            }
        }
        
        function renderSessions(sessions, user) {
            const sessionsContent = document.getElementById('sessions-content');
            
            if (sessions.length === 0) {
                sessionsContent.innerHTML = '<div class="loading">No chat sessions found for this user.</div>';
                return;
            }
            
            const sessionsHtml = \`
                <div class="sessions-list">
                    \${sessions.map(session => \`
                        <div class="session-item" onclick="showChatMessages('\${session.id}', '\${session.title}')">
                            <div class="session-header">
                                <div class="character-avatar">
                                    \${session.character_avatar ? 
                                        \`<img src="\${session.character_avatar}" alt="\${session.character_name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">\` : 
                                        (session.character_name ? session.character_name.charAt(0).toUpperCase() : 'C')
                                    }
                                </div>
                                <div class="session-info">
                                    <h4>\${session.title}</h4>
                                    <div class="session-meta">
                                        <strong>\${session.character_name}</strong> • 
                                        Created \${formatRelativeTime(session.created_at)}
                                        \${session.is_archived ? ' • <span style="color: #ef4444;">Archived</span>' : ''}
                                        \${session.status === 'deleted' ? ' • <span style="color: #dc2626; font-weight: 600;">🗑️ DELETED</span>' : ''}
                                        \${(!session.status || session.status === 'live') ? ' • <span style="color: #059669;">✅ Live</span>' : ''}
                                    </div>
                                    \${session.last_message ? \`
                                        <div class="session-preview">
                                            "\${truncateText(session.last_message.content, 100)}"
                                        </div>
                                    \` : ''}
                                </div>
                            </div>
                            <div class="session-stats">
                                <div class="message-count">\${session.message_count} messages</div>
                                <div class="last-activity">\${formatRelativeTime(session.updated_at)}</div>
                            </div>
                        </div>
                    \`).join('')}
                </div>
            \`;
            
            sessionsContent.innerHTML = sessionsHtml;
        }
        
        // Show chat messages
        async function showChatMessages(sessionId, title) {
            currentSession = { id: sessionId, title: title };
            
            document.getElementById('breadcrumb-chat-title').textContent = title;
            
            showView('chat-view');
            
            const chatContent = document.getElementById('chat-content');
            chatContent.innerHTML = '<div class="loading"><div class="spinner"></div> Loading messages...</div>';
            
            try {
                const response = await fetch(\`/api/sessions/\${sessionId}/messages?limit=100\`);
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                
                renderChatMessages(result.session, result.messages);
                
                document.getElementById('message-info').textContent = 
                    \`\${result.messages.length} of \${result.total_messages} messages\`;
                
            } catch (error) {
                console.error('Error loading messages:', error);
                chatContent.innerHTML = \`<div class="error">Error loading messages: \${error.message}</div>\`;
            }
        }
        
        function renderChatMessages(session, messages) {
            const chatContent = document.getElementById('chat-content');
            
            if (messages.length === 0) {
                chatContent.innerHTML = '<div class="loading">No messages found in this chat.</div>';
                return;
            }
            
            const chatHtml = \`
                <div class="chat-container">
                    <div class="chat-header">
                        <h3>\${session.title}</h3>
                        <p><strong>\${session.character_name}</strong> conversation with <strong>\${session.user_name}</strong></p>
                        <p style="margin-top: 0.5rem; color: #6b7280; font-size: 0.875rem;">
                            Started \${formatDateTime(session.created_at)} • Last activity \${formatDateTime(session.updated_at)}
                            \${session.status === 'deleted' ? ' • <span style="color: #dc2626; font-weight: 600;">🗑️ SOFT DELETED</span>' : ''}
                            \${(!session.status || session.status === 'live') ? ' • <span style="color: #059669; font-weight: 600;">✅ LIVE</span>' : ''}
                        </p>
                    </div>
                    <div class="chat-messages">
                        \${messages.map(message => \`
                            <div class="message \${message.role}">
                                <div class="message-avatar">
                                    \${message.role === 'user' ? 
                                        (session.user_name ? session.user_name.charAt(0).toUpperCase() : 'U') :
                                        (session.character_name ? session.character_name.charAt(0).toUpperCase() : 'A')
                                    }
                                </div>
                                <div class="message-content">
                                    <div class="message-bubble">
                                        \${formatMessageContent(message.content)}
                                    </div>
                                    <div class="message-timestamp">
                                        \${formatDateTime(message.timestamp)}
                                        \${message.token_count ? \` • \${message.token_count} tokens\` : ''}
                                    </div>
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                </div>
            \`;
            
            chatContent.innerHTML = chatHtml;
            
            // Scroll to bottom
            const chatMessages = chatContent.querySelector('.chat-messages');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // View management
        function showView(viewId) {
            document.querySelectorAll('.view').forEach(view => {
                view.classList.remove('active');
            });
            document.getElementById(viewId).classList.add('active');
        }
        
        function showUsersView() {
            showView('users-view');
            currentUser = null;
            currentSession = null;
        }
        
        function showSessionsView() {
            if (currentUser) {
                showView('sessions-view');
                currentSession = null;
            } else {
                showUsersView();
            }
        }
        
        // Utility functions
        function formatRelativeTime(dateStr) {
            if (!dateStr || dateStr === 'Invalid Date' || typeof dateStr === 'object') return 'Never';
            
            try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    console.warn('Invalid date for formatRelativeTime:', dateStr);
                    return 'Never';
                }
                
                const now = new Date();
                const diffInMinutes = Math.floor((now - date) / (1000 * 60));
                
                if (diffInMinutes < 1) return 'Just now';
                if (diffInMinutes < 60) return \`\${diffInMinutes}m ago\`;
                if (diffInMinutes < 1440) return \`\${Math.floor(diffInMinutes / 60)}h ago\`;
                if (diffInMinutes < 10080) return \`\${Math.floor(diffInMinutes / 1440)}d ago\`;
                if (diffInMinutes < 43200) return \`\${Math.floor(diffInMinutes / 10080)}w ago\`;
                return \`\${Math.floor(diffInMinutes / 43200)}mo ago\`;
            } catch (error) {
                console.warn('Date parsing error for formatRelativeTime:', dateStr, error);
                return 'Never';
            }
        }
        
        function formatDateTime(dateStr) {
            if (!dateStr || dateStr === 'Invalid Date' || typeof dateStr === 'object') return 'Unknown';
            
            try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    console.warn('Invalid date for formatDateTime:', dateStr);
                    return 'Unknown';
                }
                
                return date.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            } catch (error) {
                console.warn('Date formatting error for formatDateTime:', dateStr, error);
                return 'Unknown';
            }
        }
        
        function formatMessageContent(content) {
            if (!content) return '';
            
            // Simple HTML escape and line break handling
            return content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\\n/g, '<br>');
        }
        
        function truncateText(text, maxLength) {
            if (!text || text.length <= maxLength) return text || '';
            return text.substring(0, maxLength) + '...';
        }
    </script>
</body>
</html>`);
});

// Start server
async function startServer() {
  console.log("💬 Chat Viewer Starting...");
  console.log("═".repeat(50));

  // Test database connection
  const isConnected = await testConnection();
  if (!isConnected) {
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Chat Viewer is running!`);
    console.log(`📋 Open your browser and go to: http://localhost:${PORT}`);
    console.log(`\n✨ Features:`);
    console.log(`   • Browse all users with statistics`);
    console.log(`   • View user's chat sessions`);
    console.log(`   • Read full conversations`);
    console.log(`   • Search and filter functionality`);
    console.log(`   • Mobile-responsive interface`);
    console.log(`   • Real-time statistics dashboard`);
    console.log(`   • Hybrid database support (Supabase + PostgreSQL)`);
    console.log(`\n💡 Perfect for admin monitoring and debugging`);
    console.log(`\n📊 Press Ctrl+C to stop the server`);
    console.log("═".repeat(50));
  });
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n\n👋 Chat Viewer stopped!");
  process.exit(0);
});

// Start the server if this script is run directly
if (require.main === module) {
  startServer().catch((error) => {
    console.error("💥 Failed to start Chat Viewer:", error);
    process.exit(1);
  });
}

module.exports = { app, startServer };
