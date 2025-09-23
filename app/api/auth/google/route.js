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
    const state = searchParams.get("state");

    if (!code) {
      // Generate OAuth URL for Google sign-in
      const authUrl = client.generateAuthUrl({
        access_type: "offline",
        scope: [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
        ],
        state: state || "default",
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      });

      return NextResponse.json({
        success: true,
        authUrl,
      });
    }

    // Handle OAuth callback
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

    // Check if user exists in database
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("email", googleUser.email)
      .single();

    let user;

    if (existingUser) {
      // User exists, update last login
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          last_login: new Date().toISOString(),
          google_id: googleUser.id,
        })
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating user:", updateError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to update user",
          },
          { status: 500 }
        );
      }

      user = updatedUser;
    } else {
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
        return NextResponse.json(
          {
            success: false,
            error: "Failed to create user account",
          },
          { status: 500 }
        );
      }

      user = newUser;
    }

    // Generate session token (you might want to use JWT or similar)
    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        timestamp: Date.now(),
      })
    ).toString("base64");

    // Redirect to frontend with session token
    const redirectUrl = `${
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }?auth=success&token=${sessionToken}`;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Google OAuth error:", error);
    const errorUrl = `${
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }?auth=error&message=${encodeURIComponent(error.message)}`;
    return NextResponse.redirect(errorUrl);
  }
}

export async function POST(request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "ID token is required",
        },
        { status: 400 }
      );
    }

    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error("Invalid ID token");
    }

    // Check if user exists in database
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("email", payload.email)
      .single();

    let user;

    if (existingUser) {
      // User exists, update last login
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          last_login: new Date().toISOString(),
          google_id: payload.sub,
        })
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating user:", updateError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to update user",
          },
          { status: 500 }
        );
      }

      user = updatedUser;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert([
          {
            email: payload.email,
            username: payload.email.split("@")[0] + "_" + Date.now(),
            full_name: payload.name,
            google_id: payload.sub,
            avatar_url: payload.picture,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (createError) {
        console.error("Error creating user:", createError);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to create user account",
          },
          { status: 500 }
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

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        last_login: user.last_login,
      },
      session: {
        access_token: sessionToken,
      },
    });
  } catch (error) {
    console.error("Google OAuth POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Authentication failed",
      },
      { status: 500 }
    );
  }
}
