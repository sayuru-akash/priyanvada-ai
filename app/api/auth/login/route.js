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
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Sign in user with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      console.error("Auth login error:", authError);

      // If email not confirmed, try to auto-confirm and retry
      if (authError.code === "email_not_confirmed") {
        console.log("Attempting to auto-confirm email for user:", email);

        // Get the user by email
        const { data: userData, error: userError } =
          await supabase.auth.admin.listUsers();

        if (!userError && userData?.users) {
          const user = userData.users.find((u) => u.email === email);

          if (user) {
            console.log("Found user, confirming email...");

            // Confirm the user's email
            const { error: confirmError } =
              await supabase.auth.admin.updateUserById(user.id, {
                email_confirm: true,
              });

            if (!confirmError) {
              console.log("Email confirmed, retrying login...");

              // Retry login
              const { data: retryAuthData, error: retryError } =
                await supabase.auth.signInWithPassword({
                  email,
                  password,
                });

              if (!retryError && retryAuthData) {
                console.log("Login successful after email confirmation");
                // Continue with the successful login
                const { user: confirmedUser, session } = retryAuthData;

                // Get user profile
                const profile = await database.getUserById(confirmedUser.id);

                // Update last login
                if (profile) {
                  await supabase
                    .from("users")
                    .update({ last_login: new Date().toISOString() })
                    .eq("id", confirmedUser.id);
                }

                return NextResponse.json({
                  success: true,
                  user: {
                    id: confirmedUser.id,
                    email: confirmedUser.email,
                    username:
                      profile?.username ||
                      confirmedUser.user_metadata?.username,
                    full_name: profile?.full_name,
                    last_login: new Date().toISOString(),
                  },
                  session,
                });
              }
            }
          }
        }
      }

      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const { user, session } = authData;

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Get user profile from our custom users table
    const profile = await database.getUserById(user.id);

    // Update last login
    if (profile) {
      await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", user.id);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: profile?.username || user.user_metadata?.username,
        full_name: profile?.full_name,
        last_login: new Date().toISOString(),
      },
      session,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Login failed" },
      { status: 500 }
    );
  }
}
