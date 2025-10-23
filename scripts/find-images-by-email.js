#!/usr/bin/env node

/**
 * Find images for any user by email
 * Usage: node scripts/find-images-by-email.js <email>
 *
 * Database Architecture:
 * - Supabase: auth.users (authentication) + user_profiles (profile data)
 * - PostgreSQL: chat_sessions, messages (with images stored in JSONB)
 * - Cloudinary: Actual image storage (URLs stored in PostgreSQL)
 */

require("dotenv").config({ path: ".env.local" });
const postgres = require("../lib/postgres");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findImagesByEmail(email) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🔍 SEARCHING FOR IMAGES`);
  console.log(`Email: ${email}`);
  console.log(`${"=".repeat(80)}\n`);

  // Step 1: Find user in Supabase
  console.log("📧 Step 1: Looking up user...");

  // Try user_profiles first
  let userId = null;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("email", email)
    .single();

  if (profile) {
    userId = profile.id;
    console.log(`✅ Found in user_profiles`);
    console.log(`   ID: ${profile.id}`);
    console.log(`   Username: ${profile.username || "N/A"}`);
    console.log(`   Name: ${profile.full_name || "N/A"}`);
  } else {
    // Fallback to auth.users
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authUser = authData.users.find((u) => u.email === email);

    if (authUser) {
      userId = authUser.id;
      console.log(`✅ Found in auth.users`);
      console.log(`   ID: ${authUser.id}`);
    } else {
      console.log(`\n❌ User not found: ${email}`);
      console.log(`\n💡 Tip: Use one of these existing emails:`);
      const sampleEmails = authData.users.slice(0, 5).map((u) => u.email);
      sampleEmails.forEach((e) => console.log(`   - ${e}`));
      return;
    }
  }

  // Step 2: Find chat sessions
  console.log(`\n💬 Step 2: Finding chat sessions...`);
  const sessionsResult = await postgres.query(
    `
    SELECT 
      cs.id,
      cs.title,
      cs.created_at,
      c.name as character_name
    FROM chat_sessions cs
    LEFT JOIN characters c ON cs.character_id = c.id
    WHERE cs.user_id = $1 AND cs.status = 'live'
    ORDER BY cs.updated_at DESC
  `,
    [userId]
  );

  console.log(`✅ Found ${sessionsResult.rows.length} session(s)`);

  if (sessionsResult.rows.length === 0) {
    console.log(`ℹ️  No chat sessions found`);
    await postgres.close();
    return;
  }

  // Step 3: Find messages with images
  console.log(`\n🖼️  Step 3: Searching for images...`);
  const messagesResult = await postgres.query(
    `
    SELECT 
      m.id,
      m.session_id,
      m.content,
      m.images,
      m.timestamp,
      cs.title as session_title,
      c.name as character_name
    FROM messages m
    JOIN chat_sessions cs ON m.session_id = cs.id
    LEFT JOIN characters c ON cs.character_id = c.id
    WHERE cs.user_id = $1 
      AND m.has_images = true
      AND m.role = 'user'
    ORDER BY m.timestamp DESC
  `,
    [userId]
  );

  const messages = messagesResult.rows;
  console.log(`✅ Found ${messages.length} message(s) with images\n`);

  if (messages.length === 0) {
    console.log(`ℹ️  No images found for this user`);
    await postgres.close();
    return;
  }

  // Step 4: Display detailed results
  console.log(`${"=".repeat(80)}`);
  console.log(`📊 DETAILED RESULTS`);
  console.log(`${"=".repeat(80)}\n`);

  let totalImages = 0;
  let totalSize = 0;
  const imageUrls = [];

  messages.forEach((msg, idx) => {
    const images = msg.images || [];
    totalImages += images.length;

    console.log(`\n📝 Message ${idx + 1}/${messages.length}`);
    console.log(`   Time: ${new Date(msg.timestamp).toLocaleString()}`);
    console.log(`   Session: ${msg.session_title}`);
    console.log(`   Character: ${msg.character_name || "Unknown"}`);
    console.log(
      `   Text: "${msg.content.substring(0, 100)}${
        msg.content.length > 100 ? "..." : ""
      }"`
    );
    console.log(`   Images: ${images.length}`);

    images.forEach((img, i) => {
      const sizeKB = Math.round((img.size || 0) / 1024);
      totalSize += img.size || 0;
      imageUrls.push(img.url);

      console.log(`\n      📷 Image ${i + 1}:`);
      console.log(`         Name: ${img.name || "Unnamed"}`);
      console.log(`         URL: ${img.url}`);
      console.log(`         Cloudinary ID: ${img.publicId || "N/A"}`);
      console.log(`         Type: ${img.mimeType || "unknown"}`);
      console.log(`         Size: ${sizeKB} KB`);
      if (img.width && img.height) {
        console.log(`         Dimensions: ${img.width} × ${img.height}px`);
      }
    });
  });

  // Summary
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📈 SUMMARY`);
  console.log(`${"=".repeat(80)}`);
  console.log(`   User: ${email}`);
  console.log(`   Total sessions: ${sessionsResult.rows.length}`);
  console.log(`   Messages with images: ${messages.length}`);
  console.log(`   Total images: ${totalImages}`);
  console.log(
    `   Total size: ${Math.round(totalSize / 1024)} KB (${(
      totalSize /
      1024 /
      1024
    ).toFixed(2)} MB)`
  );

  // Image URLs list
  console.log(`\n📋 All Image URLs:`);
  imageUrls.forEach((url, i) => {
    console.log(`   ${i + 1}. ${url}`);
  });

  console.log(`\n${"=".repeat(80)}\n`);

  await postgres.close();
}

// Get email from command line or use default
const email = process.argv[2] || "sendriakavihari@gmail.com";

findImagesByEmail(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
