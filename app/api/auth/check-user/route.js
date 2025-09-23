import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create server-side Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    console.log("Checking user:", email);

    // Get all users and find the one with this email
    const { data: userData, error: userError } =
      await supabase.auth.admin.listUsers();

    if (userError) {
      console.error("Error fetching users:", userError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    const user = userData?.users?.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
        available_users: userData?.users?.map((u) => u.email) || [],
      });
    }

    // Check user profile in database
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      success: true,
      user_info: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        user_metadata: user.user_metadata,
        profile_exists: !!profile,
        profile: profile || null,
      },
    });
  } catch (error) {
    console.error("Check user error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
