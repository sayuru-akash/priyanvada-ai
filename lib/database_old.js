const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

class DatabaseService {
  // Authentication methods
  async signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (error) throw error;

    // Create user profile if signup successful
    if (data.user && !error) {
      await this.createUserProfile(data.user.id, username, email);
    }

    return data;
  }

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Update last login
    if (data.user) {
      await this.updateLastLogin(data.user.id);
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

  async getCurrentSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  }

  // Create user profile in our users table
  async createUserProfile(userId, username, email = null, fullName = null) {
    const { data, error } = await supabase
      .from("users")
      .insert({
        id: userId,
        username,
        email,
        full_name: fullName,
        last_login: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateLastLogin(userId) {
    const { error } = await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", userId);

    if (error) throw error;
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
  // User operations
  async createUser(username, email = null) {
    const { data, error } = await supabase
      .from("users")
      .insert({ username, email })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getUser(username) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 is "not found"
    return data;
  }

  // Character operations
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

    const { data, error } = await supabase
      .from("characters")
      .insert({
        creator_id: creatorId,
        name,
        title,
        description,
        personality,
        scenario,
        greeting,
        example_messages: exampleMessages,
        tags,
        avatar_url: avatarUrl,
        is_public: isPublic,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCharacters(userId = null, isPublic = null) {
    let query = supabase.from("characters").select("*").eq("is_active", true);

    if (isPublic !== null) {
      query = query.eq("is_public", isPublic);
    }

    if (userId) {
      query = query.eq("creator_id", userId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;
    return data || [];
  }

  async getCharacterById(characterId) {
    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("id", characterId)
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  async updateCharacter(characterId, updates) {
    const { data, error } = await supabase
      .from("characters")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", characterId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCharacter(characterId) {
    const { error } = await supabase
      .from("characters")
      .update({ is_active: false })
      .eq("id", characterId);

    if (error) throw error;
  }

  async incrementChatCount(characterId) {
    // Get current chat count
    const { data: character, error: fetchError } = await supabase
      .from("characters")
      .select("chat_count")
      .eq("id", characterId)
      .single();

    if (fetchError) throw fetchError;

    // Increment the count
    const { error: updateError } = await supabase
      .from("characters")
      .update({ chat_count: (character?.chat_count || 0) + 1 })
      .eq("id", characterId);

    if (updateError) throw updateError;
  }

  // Chat session operations
  async createChatSession(userId, characterId, title = "New Chat") {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: userId,
        character_id: characterId,
        title,
      })
      .select()
      .single();

    if (error) throw error;

    // Increment character chat count
    await this.incrementChatCount(characterId);

    return data;
  }

  async getChatSessions(userId, characterId = null) {
    let query = supabase
      .from("chat_sessions")
      .select(
        `
        *,
        characters!inner(name, avatar_url)
      `
      )
      .eq("user_id", userId)
      .eq("is_archived", false);

    if (characterId) {
      query = query.eq("character_id", characterId);
    }

    const { data: sessions, error } = await query.order("updated_at", {
      ascending: false,
    });

    if (error) throw error;

    // Get message counts for each session
    const sessionsWithCounts = await Promise.all(
      (sessions || []).map(async (session) => {
        const { count, error: countError } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("session_id", session.id);

        return {
          ...session,
          character_name: session.characters?.name,
          avatar_url: session.characters?.avatar_url,
          message_count: countError ? 0 : count || 0,
        };
      })
    );

    return sessionsWithCounts;
  }

  async getChatSession(sessionId) {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  async updateChatSession(sessionId, updates) {
    const updateKeys = Object.keys(updates);

    // Always update the timestamp
    const updateData =
      updateKeys.length === 0
        ? { updated_at: new Date().toISOString() }
        : { ...updates, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from("chat_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Message operations
  async addMessage(
    sessionId,
    role,
    content,
    tokenCount = null,
    metadata = null
  ) {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        session_id: sessionId,
        role,
        content,
        token_count: tokenCount,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;

    // Update session timestamp
    await this.updateChatSession(sessionId, {});

    return data;
  }

  async getMessages(sessionId, limit = 50) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getRecentMessages(sessionId, limit = 10) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).reverse(); // Return in chronological order
  }

  // Memory operations
  async saveChatMemory(sessionId, summary, keyPoints) {
    const { data, error } = await supabase
      .from("chat_memory")
      .insert({
        session_id: sessionId,
        summary,
        key_points: keyPoints,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getChatMemory(sessionId) {
    const { data, error } = await supabase
      .from("chat_memory")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  // Archive chat
  async archiveChat(sessionId) {
    return await this.updateChatSession(sessionId, { is_archived: true });
  }

  // Delete chat
  async deleteChat(sessionId) {
    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) throw error;
  }

  async close() {
    // Supabase client doesn't need to be closed explicitly
    return;
  }
}

module.exports = new DatabaseService();
