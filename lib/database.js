const { createClient } = require("@supabase/supabase-js");
const postgres = require("./postgres");

// Initialize Supabase client (for auth and users only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

class DatabaseService {
  // Character operations (using PostgreSQL)
  async createCharacter(creatorId, characterData) {
    const {
      name,
      title,
      description,
      personality,
      scenario,
      greeting,
      exampleMessages,
      tags,
      avatarUrl,
      isPublic,
    } = characterData;

    const query = `
      INSERT INTO characters (
        creator_id, name, title, description, personality, scenario, 
        greeting, example_messages, tags, avatar_url, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      creatorId,
      name,
      title,
      description,
      personality,
      scenario,
      greeting,
      exampleMessages ? JSON.stringify(exampleMessages) : null,
      tags,
      avatarUrl,
      isPublic,
    ];

    const result = await postgres.query(query, values);
    return result.rows[0];
  }

  async getCharacters(userId = null, isPublic = null) {
    let query = `
      SELECT id, name, title, description, tags, avatar_url, is_public, chat_count, created_at
      FROM characters 
      WHERE is_active = true
    `;
    const values = [];
    let paramCount = 1;

    if (isPublic !== null) {
      query += ` AND is_public = $${paramCount}`;
      values.push(isPublic);
      paramCount++;
    }

    if (userId) {
      query += ` AND creator_id = $${paramCount}`;
      values.push(userId);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await postgres.query(query, values);
    return result.rows || [];
  }

  async getCharactersWithUserChatCounts(
    currentUserId,
    userId = null,
    isPublic = null
  ) {
    let query = `
      SELECT 
        c.*,
        COALESCE(cs.user_chat_count, 0) as user_chat_count
      FROM characters c
      LEFT JOIN (
        SELECT 
          character_id,
          COUNT(*) as user_chat_count
        FROM chat_sessions 
        WHERE user_id = $1 AND is_archived = false
        GROUP BY character_id
      ) cs ON c.id = cs.character_id
      WHERE c.is_active = true
    `;

    const values = [currentUserId];
    let paramCount = 2;

    if (isPublic !== null) {
      query += ` AND c.is_public = $${paramCount}`;
      values.push(isPublic);
      paramCount++;
    }

    if (userId) {
      query += ` AND c.creator_id = $${paramCount}`;
      values.push(userId);
      paramCount++;
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await postgres.query(query, values);
    return result.rows || [];
  }

  async getCharacterById(characterId) {
    const query = `
      SELECT * FROM characters 
      WHERE id = $1 AND is_active = true
    `;

    const result = await postgres.query(query, [characterId]);
    return result.rows[0] || null;
  }

  async updateCharacter(characterId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(updates.name);
      paramCount++;
    }
    if (updates.title !== undefined) {
      fields.push(`title = $${paramCount}`);
      values.push(updates.title);
      paramCount++;
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramCount}`);
      values.push(updates.description);
      paramCount++;
    }
    if (updates.personality !== undefined) {
      fields.push(`personality = $${paramCount}`);
      values.push(updates.personality);
      paramCount++;
    }
    if (updates.scenario !== undefined) {
      fields.push(`scenario = $${paramCount}`);
      values.push(updates.scenario);
      paramCount++;
    }
    if (updates.greeting !== undefined) {
      fields.push(`greeting = $${paramCount}`);
      values.push(updates.greeting);
      paramCount++;
    }
    if (updates.exampleMessages !== undefined) {
      fields.push(`example_messages = $${paramCount}`);
      values.push(JSON.stringify(updates.exampleMessages));
      paramCount++;
    }
    if (updates.tags !== undefined) {
      fields.push(`tags = $${paramCount}`);
      values.push(updates.tags);
      paramCount++;
    }
    if (updates.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${paramCount}`);
      values.push(updates.avatarUrl);
      paramCount++;
    }
    if (updates.isPublic !== undefined) {
      fields.push(`is_public = $${paramCount}`);
      values.push(updates.isPublic);
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error("No valid fields to update");
    }

    const query = `
      UPDATE characters 
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(characterId);

    const result = await postgres.query(query, values);
    return result.rows[0];
  }

  async deleteCharacter(characterId) {
    const query = `
      UPDATE characters 
      SET is_active = false 
      WHERE id = $1
    `;

    await postgres.query(query, [characterId]);
  }

  async incrementChatCount(characterId) {
    const query = `
      UPDATE characters 
      SET chat_count = chat_count + 1 
      WHERE id = $1
      RETURNING chat_count
    `;

    const result = await postgres.query(query, [characterId]);
    return result.rows[0]?.chat_count || 0;
  }

  async getUserChatCountForCharacter(userId, characterId) {
    const query = `
      SELECT COUNT(*) as count 
      FROM chat_sessions 
      WHERE user_id = $1 AND character_id = $2 AND is_archived = false
    `;

    const result = await postgres.query(query, [userId, characterId]);
    return parseInt(result.rows[0]?.count || 0);
  }

  // Chat session operations (using PostgreSQL)
  async createChatSession(userId, characterId, title = "New Chat") {
    const query = `
      INSERT INTO chat_sessions (user_id, character_id, title)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await postgres.query(query, [userId, characterId, title]);
    const session = result.rows[0];

    // Increment character chat count
    await this.incrementChatCount(characterId);

    return session;
  }

  async getChatSessions(userId, characterId = null) {
    let query = `
      SELECT 
        cs.*,
        c.name as character_name,
        c.avatar_url,
        (SELECT COUNT(*) FROM messages WHERE session_id = cs.id) as message_count
      FROM chat_sessions cs
      INNER JOIN characters c ON cs.character_id = c.id
      WHERE cs.user_id = $1 AND cs.is_archived = false AND (cs.status IS NULL OR cs.status = 'live')
    `;

    const values = [userId];
    let paramCount = 2;

    if (characterId) {
      query += ` AND cs.character_id = $${paramCount}`;
      values.push(characterId);
    }

    query += ` ORDER BY cs.updated_at DESC`;

    const result = await postgres.query(query, values);
    return result.rows || [];
  }

  async getChatSession(sessionId, includeDeleted = false) {
    let query = `
      SELECT * FROM chat_sessions 
      WHERE id = $1
    `;

    if (!includeDeleted) {
      query += ` AND (status IS NULL OR status = 'live')`;
    }

    const result = await postgres.query(query, [sessionId]);
    return result.rows[0] || null;
  }

  async updateChatSession(sessionId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Add specific update fields if provided
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    // Always update the timestamp
    fields.push(`updated_at = NOW()`);

    const query = `
      UPDATE chat_sessions 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    values.push(sessionId);

    const result = await postgres.query(query, values);
    return result.rows[0];
  }

  // Message operations (using PostgreSQL)
  async addMessage(
    sessionId,
    role,
    content,
    tokenCount = null,
    metadata = null
  ) {
    const query = `
      INSERT INTO messages (session_id, role, content, token_count, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      sessionId,
      role,
      content,
      tokenCount,
      metadata ? JSON.stringify(metadata) : null,
    ];

    const result = await postgres.query(query, values);
    const message = result.rows[0];

    // Update session timestamp
    await this.updateChatSession(sessionId, {});

    return message;
  }

  async getMessages(sessionId, limit = 50) {
    const query = `
      SELECT * FROM messages 
      WHERE session_id = $1 
      ORDER BY timestamp ASC 
      LIMIT $2
    `;

    const result = await postgres.query(query, [sessionId, limit]);
    return result.rows || [];
  }

  async getRecentMessages(sessionId, limit = 10) {
    const query = `
      SELECT * FROM messages 
      WHERE session_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2
    `;

    const result = await postgres.query(query, [sessionId, limit]);
    return (result.rows || []).reverse(); // Return in chronological order
  }

  // Memory operations (using PostgreSQL)
  async saveChatMemory(sessionId, summary, keyPoints) {
    const query = `
      INSERT INTO chat_memory (session_id, summary, key_points)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [sessionId, summary, JSON.stringify(keyPoints)];

    const result = await postgres.query(query, values);
    return result.rows[0];
  }

  async getChatMemory(sessionId) {
    const query = `
      SELECT * FROM chat_memory 
      WHERE session_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const result = await postgres.query(query, [sessionId]);
    return result.rows[0] || null;
  }

  // Archive chat (using PostgreSQL)
  async archiveChat(sessionId) {
    return await this.updateChatSession(sessionId, { is_archived: true });
  }

  // Soft delete chat (using PostgreSQL) - changes status to 'deleted'
  async deleteChat(sessionId) {
    const query = `UPDATE chat_sessions SET status = 'deleted', updated_at = NOW() WHERE id = $1`;
    await postgres.query(query, [sessionId]);
  }

  // Authentication operations
  async signUp(email, password, username, fullName = null) {
    // Create user with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          username: username,
          full_name: fullName,
        },
        email_confirm: false,
      });

    if (authError) throw authError;

    const { user } = authData;

    // Create user profile in our custom users table
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .insert({
        id: user.id,
        username,
        email,
        full_name: fullName,
        last_login: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(user.id);
      throw profileError;
    }

    return { user, session: null };
  }

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Update last login
    if (data.user) {
      await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", data.user.id);
    }

    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  // Legacy user operations (for backward compatibility)
  async getUser(username) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 is "not found"
    return data;
  }

  async getUserById(userId) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  async close() {
    // Close PostgreSQL connections
    await postgres.close();
    // Supabase client doesn't need to be closed explicitly
    return;
  }
}

module.exports = new DatabaseService();
