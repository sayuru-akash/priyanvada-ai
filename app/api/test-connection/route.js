import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create server-side Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    console.log("Test endpoint called");

    // Test environment variables
    console.log(
      "NEXT_PUBLIC_SUPABASE_URL:",
      process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Not set"
    );
    console.log(
      "SUPABASE_SERVICE_ROLE_KEY:",
      process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Not set"
    );

    // Test database connection
    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Database connection error:", error);
      return NextResponse.json({
        success: false,
        error: "Database connection failed",
        details: error.message,
      });
    }

    console.log("Database connection successful");

    // Test auth admin functions
    try {
      const { data: authTest, error: authError } =
        await supabase.auth.admin.listUsers();

      if (authError) {
        console.error("Auth admin error:", authError);
        return NextResponse.json({
          success: false,
          error: "Auth admin connection failed",
          details: authError.message,
        });
      }

      console.log("Auth admin connection successful");

      return NextResponse.json({
        success: true,
        message: "All connections working",
        data: {
          databaseConnection: "OK",
          authAdminConnection: "OK",
          userCount: count || 0,
          authUserCount: authTest?.users?.length || 0,
        },
      });
    } catch (authErr) {
      console.error("Auth admin exception:", authErr);
      return NextResponse.json({
        success: false,
        error: "Auth admin exception",
        details: authErr.message,
      });
    }
  } catch (error) {
    console.error("Test endpoint error:", error);
    return NextResponse.json({
      success: false,
      error: "Test endpoint failed",
      details: error.message,
      stack: error.stack,
    });
  }
}
