import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Initialize Google OAuth2 client
const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    if (error) {
      console.error("OAuth error:", error);
      const errorUrl = `${
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      }/auth?auth=error&message=${encodeURIComponent(error)}`;
      return NextResponse.redirect(errorUrl);
    }

    if (!code) {
      console.error("No authorization code received");
      const errorUrl = `${
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      }/auth?auth=error&message=No authorization code received`;
      return NextResponse.redirect(errorUrl);
    }

    console.log(
      "Processing OAuth callback with code:",
      code.substring(0, 10) + "..."
    );

    // Handle OAuth callback directly here
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      throw new Error("Failed to fetch user info from Google");
    }

    const googleUser = await userInfoResponse.json();
    console.log("Google user info:", {
      email: googleUser.email,
      name: googleUser.name,
    });

    // Check if user exists in database
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("email", googleUser.email)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Database fetch error:", fetchError);
      throw new Error("Database error: " + fetchError.message);
    }

    let user;

    if (existingUser) {
      console.log("Updating existing user:", existingUser.email);
      // User exists, update last login
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          last_login: new Date().toISOString(),
          google_id: googleUser.id,
          avatar_url: googleUser.picture, // Update avatar URL
        })
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating user:", updateError);
        throw new Error("Failed to update user: " + updateError.message);
      }

      user = updatedUser;
    } else {
      console.log("Creating new user for:", googleUser.email);
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert([
          {
            email: googleUser.email,
            username: googleUser.email.split("@")[0] + "_" + Date.now(),
            full_name: googleUser.name,
            google_id: googleUser.id,
            avatar_url: googleUser.picture,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error("Error creating user:", createError);
        throw new Error(
          "Failed to create user account: " + createError.message
        );
      }

      user = newUser;
    }

    // Generate session token
    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        timestamp: Date.now(),
      })
    ).toString("base64");

    console.log("Authentication successful for user:", user.email);

    // Redirect to frontend with session token
    const redirectUrl = `${
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }/auth?auth=success&token=${sessionToken}`;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    const errorUrl = `${
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }/auth?auth=error&message=${encodeURIComponent(error.message)}`;
    return NextResponse.redirect(errorUrl);
  }
}
