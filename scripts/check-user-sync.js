const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserSync() {
  console.log(
    "🔍 Checking user synchronization between Auth and Users table...\n"
  );

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

    // Get all users from custom users table
    const { data: profileUsers, error: profileError } = await supabase
      .from("users")
      .select("*");

    if (profileError) {
      console.error("❌ Error fetching profile users:", profileError);
      return;
    }

    console.log(`📊 Found ${profileUsers.length} users in Users table\n`);

    // Check for missing profiles
    const missingProfiles = [];
    const existingProfiles = [];

    for (const authUser of authUsers) {
      const profile = profileUsers.find((p) => p.id === authUser.id);
      if (!profile) {
        missingProfiles.push(authUser);
      } else {
        existingProfiles.push({ auth: authUser, profile });
      }
    }

    console.log("📋 SYNC STATUS REPORT:");
    console.log("=".repeat(50));
    console.log(`✅ Users with profiles: ${existingProfiles.length}`);
    console.log(`❌ Users missing profiles: ${missingProfiles.length}\n`);

    if (missingProfiles.length > 0) {
      console.log("🚨 USERS MISSING PROFILES:");
      console.log("-".repeat(30));
      missingProfiles.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(
          `   Username: ${user.user_metadata?.username || "Not set"}`
        );
        console.log(`   Created: ${user.created_at}`);
        console.log();
      });

      // Check if the specific user from the error exists
      const problemUserId = "81a33e13-1b9c-4f0b-9600-eeed935dd731";
      const problemUser = authUsers.find((u) => u.id === problemUserId);

      if (problemUser) {
        console.log(`🎯 FOUND THE PROBLEM USER (${problemUserId}):`);
        console.log(`   Email: ${problemUser.email}`);
        console.log(
          `   Username: ${problemUser.user_metadata?.username || "Not set"}`
        );
        console.log(`   This user exists in Auth but NOT in users table!\n`);
      }
    }

    if (existingProfiles.length > 0) {
      console.log("✅ USERS WITH COMPLETE PROFILES:");
      console.log("-".repeat(30));
      existingProfiles.slice(0, 5).forEach((item, index) => {
        console.log(
          `${index + 1}. ${item.profile.email} (${item.profile.username})`
        );
      });
      if (existingProfiles.length > 5) {
        console.log(`   ... and ${existingProfiles.length - 5} more`);
      }
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

checkUserSync();
