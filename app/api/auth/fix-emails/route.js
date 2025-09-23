import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create server-side Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    console.log("Fixing email confirmations for all users...");

    // Get all users
    const { data: userData, error: userError } =
      await supabase.auth.admin.listUsers();

    if (userError) {
      console.error("Error fetching users:", userError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    const users = userData?.users || [];
    console.log(`Found ${users.length} users`);

    const results = [];

    for (const user of users) {
      try {
        if (!user.email_confirmed_at) {
          console.log(`Confirming email for user: ${user.email}`);

          const { error: confirmError } =
            await supabase.auth.admin.updateUserById(user.id, {
              email_confirm: true,
            });

          if (confirmError) {
            console.error(`Failed to confirm ${user.email}:`, confirmError);
            results.push({
              email: user.email,
              status: "failed",
              error: confirmError.message,
            });
          } else {
            console.log(`Successfully confirmed ${user.email}`);
            results.push({
              email: user.email,
              status: "confirmed",
            });
          }
        } else {
          results.push({
            email: user.email,
            status: "already_confirmed",
          });
        }
      } catch (err) {
        console.error(`Exception confirming ${user.email}:`, err);
        results.push({
          email: user.email,
          status: "exception",
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Email confirmation fix completed",
      results,
      summary: {
        total: users.length,
        confirmed: results.filter((r) => r.status === "confirmed").length,
        already_confirmed: results.filter(
          (r) => r.status === "already_confirmed"
        ).length,
        failed: results.filter(
          (r) => r.status === "failed" || r.status === "exception"
        ).length,
      },
    });
  } catch (error) {
    console.error("Fix emails error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
