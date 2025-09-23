const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncMissingProfiles() {
  console.log("🔄 Syncing missing user profiles...\n");

  try {
    // Get all auth users
    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("❌ Error fetching auth users:", authError);
      return;
    }

    const authUsers = authData?.users || [];
    console.log(`📊 Found ${authUsers.length} users in Supabase Auth`);

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
            `❌ Error checking profile for ${user.email}:`,
            checkError
          );
          results.push({
            email: user.email,
            id: user.id,
            status: "check_failed",
            error: checkError.message,
          });
          continue;
        }

        if (!existingProfile) {
          console.log(
            `🔧 Creating profile for user: ${user.email} (${user.id})`
          );

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
              `❌ Failed to create profile for ${user.email}:`,
              insertError
            );
            results.push({
              email: user.email,
              id: user.id,
              status: "create_failed",
              error: insertError.message,
            });
          } else {
            console.log(`✅ Successfully created profile for ${user.email}`);
            results.push({
              email: user.email,
              id: user.id,
              status: "created",
              profile: newProfile,
            });
          }
        } else {
          results.push({
            email: user.email,
            id: user.id,
            status: "already_exists",
          });
        }
      } catch (err) {
        console.error(`❌ Exception syncing ${user.email}:`, err);
        results.push({
          email: user.email,
          id: user.id,
          status: "exception",
          error: err.message,
        });
      }
    }

    console.log("\n📋 SYNC RESULTS:");
    console.log("=".repeat(50));

    const created = results.filter((r) => r.status === "created");
    const alreadyExists = results.filter((r) => r.status === "already_exists");
    const failed = results.filter(
      (r) => r.status.includes("failed") || r.status === "exception"
    );

    console.log(`✅ Profiles created: ${created.length}`);
    console.log(`ℹ️  Already existed: ${alreadyExists.length}`);
    console.log(`❌ Failed: ${failed.length}\n`);

    if (created.length > 0) {
      console.log("🎉 NEWLY CREATED PROFILES:");
      console.log("-".repeat(30));
      created.forEach((result, index) => {
        console.log(`${index + 1}. ${result.email} (ID: ${result.id})`);
      });
      console.log();
    }

    if (failed.length > 0) {
      console.log("❌ FAILED PROFILES:");
      console.log("-".repeat(30));
      failed.forEach((result, index) => {
        console.log(`${index + 1}. ${result.email} (ID: ${result.id})`);
        console.log(`   Error: ${result.error}`);
      });
    }

    // Special check for the problem user
    const problemUserId = "81a33e13-1b9c-4f0b-9600-eeed935dd731";
    const problemResult = results.find((r) => r.id === problemUserId);

    if (problemResult) {
      console.log(`\n🎯 PROBLEM USER STATUS (${problemUserId}):`);
      console.log(`   Email: ${problemResult.email}`);
      console.log(`   Status: ${problemResult.status}`);

      if (problemResult.status === "created") {
        console.log(
          "   ✅ Profile successfully created! Character creation should now work."
        );
      } else if (problemResult.status === "already_exists") {
        console.log(
          "   ℹ️  Profile already exists. There might be another issue."
        );
      } else {
        console.log(`   ❌ Failed to create profile: ${problemResult.error}`);
      }
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

syncMissingProfiles();
