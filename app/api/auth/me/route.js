import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import database from "../../../../lib/database.js";

// Create server-side Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET: Get current user
export async function GET(request) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    // Try to parse as custom token first (from Google OAuth)
    try {
      const decodedToken = JSON.parse(Buffer.from(token, "base64").toString());

      // Validate custom token structure
      if (decodedToken.userId && decodedToken.email && decodedToken.timestamp) {
        // Check if token is not too old (24 hours)
        const tokenAge = Date.now() - decodedToken.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        if (tokenAge > maxAge) {
          return NextResponse.json(
            { success: false, error: "Token expired" },
            { status: 401 }
          );
        }

        // Get user profile from our custom users table using the userId from token
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", decodedToken.userId)
          .single();

        if (profileError || !profile) {
          return NextResponse.json(
            { success: false, error: "User not found" },
            { status: 401 }
          );
        }

        return NextResponse.json({
          success: true,
          user: {
            id: profile.id,
            email: profile.email,
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            last_login: profile.last_login,
          },
        });
      }
    } catch (decodeError) {
      // If custom token parsing fails, try Supabase JWT
      console.log(
        "Custom token decode failed, trying Supabase JWT:",
        decodeError.message
      );
    }

    // Fallback: Try as Supabase JWT token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get user profile from our custom users table
    const profile = await database.getUserById(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: profile?.username || user.user_metadata?.username,
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
        last_login: profile?.last_login,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get user information" },
      { status: 500 }
    );
  }
}

// POST: Sign out user
export async function POST(request) {
  try {
    // Get Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];

    // Sign out the user
    const { error } = await supabase.auth.admin.signOut(token);

    if (error) {
      console.error("Logout error:", error);
      return NextResponse.json(
        { success: false, error: "Logout failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Signed out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
  }
}
