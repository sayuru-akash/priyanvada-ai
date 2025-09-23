import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import database from "../../../../lib/database.js";

// Create server-side Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { email, password, username, fullName } = await request.json();

    if (!email || !password || !username) {
      return NextResponse.json(
        { success: false, error: "Email, password, and username are required" },
        { status: 400 }
      );
    }

    // Check if username already exists in the users table
    const { data: existingUser } = await supabase
      .from("users")
      .select("username")
      .eq("username", username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Username already exists" },
        { status: 409 }
      );
    }

    console.log(
      "Attempting to create user with email:",
      email,
      "username:",
      username
    );

    // Create auth user with user_metadata
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          username: username,
          full_name: fullName,
        },
        email_confirm: false, // Skip email confirmation for development
      });

    if (authError) {
      console.error("Auth signup error:", authError);
      console.error("Full error details:", JSON.stringify(authError, null, 2));
      return NextResponse.json(
        { success: false, error: authError.message || "Registration failed" },
        { status: 500 }
      );
    }

    console.log("Auth user created successfully:", authData.user.id);

    const { user } = authData;

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User creation failed" },
        { status: 500 }
      );
    }

    // The trigger function will automatically create the user profile
    // But let's wait a moment and check if it was created
    console.log("Waiting for trigger to create user profile...");

    // Wait a bit for the trigger to execute
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if the profile was created by the trigger
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    console.log("User profile check:", profile ? "Found" : "Not found");

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: profile?.username || user.user_metadata?.username || username,
        full_name:
          profile?.full_name || user.user_metadata?.full_name || fullName,
        last_login: profile?.last_login || new Date().toISOString(),
      },
      message: "Registration successful!",
    });
  } catch (error) {
    console.error("Registration error:", error);
    console.error("Full error stack:", error.stack);
    return NextResponse.json(
      { success: false, error: `Registration error: ${error.message}` },
      { status: 500 }
    );
  }
}
