import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create server-side Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    console.log("Syncing user profiles...");

    // Get all users from auth
    const { data: userData, error: userError } =
      await supabase.auth.admin.listUsers();

    if (userError) {
      console.error("Error fetching users:", userError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    const authUsers = userData?.users || [];
    console.log(`Found ${authUsers.length} auth users`);

    const results = [];

    for (const user of authUsers) {
      try {
        // Check if profile exists
        const { data: existingProfile, error: checkError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          console.error(
            `Error checking profile for ${user.email}:`,
            checkError
          );
          results.push({
            email: user.email,
            status: "check_failed",
            error: checkError.message,
          });
          continue;
        }

        if (!existingProfile) {
          console.log(`Creating profile for user: ${user.email}`);

          // Create user profile
          const { data: newProfile, error: insertError } = await supabase
            .from("users")
            .insert({
              id: user.id,
              username:
                user.user_metadata?.username || user.email.split("@")[0],
              email: user.email,
              full_name: user.user_metadata?.full_name || null,
              last_login: new Date().toISOString(),
            })
            .select()
            .single();

          if (insertError) {
            console.error(
              `Failed to create profile for ${user.email}:`,
              insertError
            );
            results.push({
              email: user.email,
              status: "create_failed",
              error: insertError.message,
            });
          } else {
            console.log(`Successfully created profile for ${user.email}`);
            results.push({
              email: user.email,
              status: "created",
              profile: newProfile,
            });
          }
        } else {
          results.push({
            email: user.email,
            status: "already_exists",
          });
        }
      } catch (err) {
        console.error(`Exception syncing ${user.email}:`, err);
        results.push({
          email: user.email,
          status: "exception",
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "User profile sync completed",
      results,
      summary: {
        total: authUsers.length,
        created: results.filter((r) => r.status === "created").length,
        already_exists: results.filter((r) => r.status === "already_exists")
          .length,
        failed: results.filter(
          (r) => r.status.includes("failed") || r.status === "exception"
        ).length,
      },
    });
  } catch (error) {
    console.error("Sync profiles error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
