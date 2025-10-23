#!/usr/bin/env node

/**
 * Fetch all images from all users across all chat sessions
 * No pagination - fetches everything
 *
 * Usage: node scripts/fetch-all-user-images.js
 */

require("dotenv").config({ path: ".env.local" });
const postgres = require("../lib/postgres");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchAllUserImages() {
  console.log("\n" + "=".repeat(80));
  console.log("📸 FETCHING ALL USER IMAGES");
  console.log("=".repeat(80) + "\n");

  try {
    // Step 1: Get all users from Supabase using table query (not auth API)
    console.log(
      "👥 Step 1: Fetching all users from Supabase users table (with pagination)..."
    );

    let allUsers = [];
    let from = 0;
    const perPage = 1000; // Max per page
    let pageNum = 1;

    while (true) {
      console.log(
        `   Fetching page ${pageNum} (rows ${from}-${from + perPage - 1})...`
      );

      const { data, error, count } = await supabase
        .from("users")
        .select("*", { count: "exact" })
        .range(from, from + perPage - 1);

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        break; // No more users
      }

      allUsers = allUsers.concat(data);
      console.log(
        `   Got ${data.length} users (total so far: ${allUsers.length}${
          count ? ` of ${count}` : ""
        })`
      );

      // If we got fewer users than perPage, we're done
      if (data.length < perPage) {
        break;
      }

      from += perPage;
      pageNum++;
    }

    console.log(
      `✅ Found ${allUsers.length} total users across ${pageNum} page(s)\n`
    );

    // Step 2: Get all messages with images from PostgreSQL
    console.log(
      "🖼️  Step 2: Fetching all messages with images from database..."
    );

    const messagesResult = await postgres.query(`
      SELECT 
        m.id,
        m.session_id,
        m.content,
        m.images,
        m.timestamp,
        m.role,
        cs.user_id,
        cs.title as session_title,
        c.name as character_name
      FROM messages m
      JOIN chat_sessions cs ON m.session_id = cs.id
      LEFT JOIN characters c ON cs.character_id = c.id
      WHERE m.has_images = true
        AND m.role = 'user'
      ORDER BY m.timestamp DESC
    `);

    console.log(
      `✅ Found ${messagesResult.rows.length} messages with images\n`
    );

    // Step 3: Create a user lookup map
    const userMap = new Map();
    allUsers.forEach((user) => {
      userMap.set(user.id, {
        email: user.email || "N/A",
        username: user.username || "N/A",
        fullName: user.full_name || "N/A",
      });
    });

    // Step 4: Group images by user
    const userImagesMap = new Map();
    let totalImages = 0;
    let totalSize = 0;

    messagesResult.rows.forEach((msg) => {
      const images = msg.images || [];
      totalImages += images.length;

      if (!userImagesMap.has(msg.user_id)) {
        userImagesMap.set(msg.user_id, {
          messages: [],
          imageCount: 0,
          totalSize: 0,
        });
      }

      const userData = userImagesMap.get(msg.user_id);
      userData.messages.push(msg);
      userData.imageCount += images.length;

      images.forEach((img) => {
        userData.totalSize += img.size || 0;
        totalSize += img.size || 0;
      });
    });

    // Step 5: Display results
    console.log("=".repeat(80));
    console.log("📊 RESULTS BY USER");
    console.log("=".repeat(80) + "\n");

    const userIds = Array.from(userImagesMap.keys());

    userIds.forEach((userId, idx) => {
      const userData = userImagesMap.get(userId);
      const userInfo = userMap.get(userId) || {
        email: "Unknown",
        username: "Unknown",
        fullName: "Unknown",
      };

      console.log(`\n${idx + 1}. 👤 ${userInfo.username} (${userInfo.email})`);
      console.log(`   Full Name: ${userInfo.fullName}`);
      console.log(`   User ID: ${userId}`);
      console.log(`   📷 Images: ${userData.imageCount}`);
      console.log(`   💬 Messages with images: ${userData.messages.length}`);
      console.log(
        `   💾 Total size: ${Math.round(userData.totalSize / 1024)} KB (${(
          userData.totalSize /
          1024 /
          1024
        ).toFixed(2)} MB)`
      );

      // Show first 3 images as examples
      const exampleMessages = userData.messages.slice(0, 3);
      console.log(`\n   Recent images:`);

      exampleMessages.forEach((msg, msgIdx) => {
        const images = msg.images || [];
        console.log(
          `\n      📝 Message ${msgIdx + 1} - ${new Date(
            msg.timestamp
          ).toLocaleDateString()}`
        );
        console.log(`         Session: ${msg.session_title}`);

        images.forEach((img, imgIdx) => {
          console.log(
            `         📷 ${img.name || "Unnamed"} - ${Math.round(
              (img.size || 0) / 1024
            )} KB`
          );
          console.log(`            ${img.url}`);
        });
      });

      if (userData.messages.length > 3) {
        console.log(
          `\n      ... and ${
            userData.messages.length - 3
          } more message(s) with images`
        );
      }
    });

    // Step 6: Summary statistics
    console.log("\n" + "=".repeat(80));
    console.log("📈 OVERALL SUMMARY");
    console.log("=".repeat(80));
    console.log(`   Total users in system: ${allUsers.length}`);
    console.log(`   Users with images: ${userImagesMap.size}`);
    console.log(`   Total messages with images: ${messagesResult.rows.length}`);
    console.log(`   Total images: ${totalImages}`);
    console.log(
      `   Total storage used: ${Math.round(totalSize / 1024)} KB (${(
        totalSize /
        1024 /
        1024
      ).toFixed(2)} MB)`
    );
    console.log(
      `   Average images per user: ${(totalImages / userImagesMap.size).toFixed(
        1
      )}`
    );
    console.log(
      `   Average size per image: ${Math.round(
        totalSize / totalImages / 1024
      )} KB`
    );

    // Top 5 users by image count
    console.log("\n📊 Top 5 users by image count:");
    const sortedByCount = Array.from(userImagesMap.entries())
      .sort((a, b) => b[1].imageCount - a[1].imageCount)
      .slice(0, 5);

    sortedByCount.forEach(([userId, data], idx) => {
      const userInfo = userMap.get(userId) || {
        username: "Unknown",
        email: "Unknown",
      };
      console.log(
        `   ${idx + 1}. ${userInfo.username} - ${
          data.imageCount
        } images (${Math.round(data.totalSize / 1024)} KB)`
      );
    });

    // Export option
    console.log("\n" + "=".repeat(80));
    console.log("💾 Data Export");
    console.log("=".repeat(80));

    const exportData = {
      generatedAt: new Date().toISOString(),
      totalUsers: allUsers.length,
      usersWithImages: userImagesMap.size,
      totalImages: totalImages,
      totalSizeBytes: totalSize,
      users: [],
    };

    userIds.forEach((userId) => {
      const userData = userImagesMap.get(userId);
      const userInfo = userMap.get(userId) || {
        email: "Unknown",
        username: "Unknown",
        fullName: "Unknown",
      };

      const userExport = {
        userId: userId,
        email: userInfo.email,
        username: userInfo.username,
        fullName: userInfo.fullName,
        imageCount: userData.imageCount,
        messageCount: userData.messages.length,
        totalSize: userData.totalSize,
        images: [],
      };

      userData.messages.forEach((msg) => {
        const images = msg.images || [];
        images.forEach((img) => {
          userExport.images.push({
            url: img.url,
            name: img.name,
            size: img.size,
            width: img.width,
            height: img.height,
            mimeType: img.mimeType,
            publicId: img.publicId,
            timestamp: msg.timestamp,
            sessionTitle: msg.session_title,
            characterName: msg.character_name,
          });
        });
      });

      exportData.users.push(userExport);
    });

    const fs = require("fs");
    const exportPath = "./all-user-images-export.json";
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

    console.log(`✅ Full data exported to: ${exportPath}`);
    console.log(
      `   File size: ${Math.round(fs.statSync(exportPath).size / 1024)} KB`
    );
    console.log("\n" + "=".repeat(80) + "\n");

    await postgres.close();
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    await postgres.close();
    process.exit(1);
  }
}

fetchAllUserImages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Fatal error:", error.message);
    process.exit(1);
  });
