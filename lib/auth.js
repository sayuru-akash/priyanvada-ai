"use client";

import { createClient } from "@supabase/supabase-js";

// Create a client-side Supabase client for authentication
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export class AuthService {
  constructor() {
    this.supabase = supabase;
  }

  // Authentication methods
  async signUp(email, password, username) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (error) throw error;
    return data;
  }

  async signIn(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  async getCurrentSession() {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession();
    if (error) throw error;
    return session;
  }

  // Listen to auth changes
  onAuthStateChange(callback) {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  // Get user profile from our custom users table
  async getUserProfile(userId) {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  // Create user profile
  async createUserProfile(userId, username, email = null, fullName = null) {
    const { data, error } = await this.supabase
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

  // Update last login
  async updateLastLogin(userId) {
    const { error } = await this.supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", userId);

    if (error) throw error;
  }
}

const authService = new AuthService();
export default authService;
