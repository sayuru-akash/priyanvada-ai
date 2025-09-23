// Alternative registration approach - bypassing admin.createUser
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create client-side Supabase client (using anon key instead of service role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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

    // Use regular signUp instead of admin.createUser
    console.log(
      "Attempting regular signup with email:",
      email,
      "username:",
      username
    );

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          full_name: fullName,
        },
      },
    });

    if (authError) {
      console.error("Auth signup error:", authError);
      return NextResponse.json(
        { success: false, error: authError.message || "Registration failed" },
        { status: 500 }
      );
    }

    console.log("Regular signup successful:", authData.user?.id);

    // For now, let's just return success without creating custom profile
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user?.id,
        email: authData.user?.email,
        username: username,
        full_name: fullName,
      },
      message:
        "Registration successful! Please check your email for confirmation.",
      needsConfirmation: !authData.session, // true if email confirmation is required
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: `Registration error: ${error.message}` },
      { status: 500 }
    );
  }
}
