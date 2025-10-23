#!/usr/bin/env node

/**
 * Download all images from the all-user-images-export.json file
 * Saves images organized by user in a folder structure
 *
 * Usage: node scripts/download-all-images.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// Configuration
const JSON_FILE = "./all-user-images-export.json";
const OUTPUT_DIR = "./downloaded-images";

// Helper function to download a file
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    const file = fs.createWriteStream(outputPath);

    protocol
      .get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);

          file.on("finish", () => {
            file.close();
            resolve();
          });
        } else if (response.statusCode === 301 || response.statusCode === 302) {
          // Handle redirect
          file.close();
          fs.unlinkSync(outputPath);
          downloadFile(response.headers.location, outputPath)
            .then(resolve)
            .catch(reject);
        } else {
          file.close();
          fs.unlinkSync(outputPath);
          reject(new Error(`Failed to download: ${response.statusCode}`));
        }
      })
      .on("error", (err) => {
        file.close();
        fs.unlinkSync(outputPath);
        reject(err);
      });
  });
}

// Sanitize filename
function sanitizeFilename(filename) {
  return filename.replace(/[^a-z0-9_\-\.]/gi, "_");
}

// Main function
async function downloadAllImages() {
  console.log("\n" + "=".repeat(80));
  console.log("📥 DOWNLOADING ALL USER IMAGES");
  console.log("=".repeat(80) + "\n");

  // Read JSON file
  console.log(`📖 Reading ${JSON_FILE}...`);

  if (!fs.existsSync(JSON_FILE)) {
    console.error(`❌ File not found: ${JSON_FILE}`);
    console.log(
      "Please run fetch-all-user-images.js first to generate the export file."
    );
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));

  console.log(`✅ Found ${data.users.length} users with images`);
  console.log(`📊 Total images to download: ${data.totalImages}\n`);

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let downloadedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const failedDownloads = [];

  // Process each user
  for (let userIdx = 0; userIdx < data.users.length; userIdx++) {
    const user = data.users[userIdx];

    console.log(
      `\n[${userIdx + 1}/${data.users.length}] 👤 ${
        user.username || user.email
      }`
    );
    console.log(`   Images: ${user.imageCount}`);

    // Create user directory
    const userDirName = sanitizeFilename(
      `${user.username}_${user.userId.substring(0, 8)}` ||
        `${user.email}_${user.userId.substring(0, 8)}`
    );
    const userDir = path.join(OUTPUT_DIR, userDirName);

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Download each image
    for (let imgIdx = 0; imgIdx < user.images.length; imgIdx++) {
      const image = user.images[imgIdx];

      // Generate filename
      const timestamp = new Date(image.timestamp).toISOString().split("T")[0];
      const ext = path.extname(image.name || ".jpg");
      const basename = path.basename(image.name || `image_${imgIdx}`, ext);
      const filename = sanitizeFilename(`${timestamp}_${basename}${ext}`);
      const outputPath = path.join(userDir, filename);

      // Skip if already exists
      if (fs.existsSync(outputPath)) {
        console.log(`   ⏭️  Skipped (exists): ${filename}`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`   ⬇️  Downloading: ${filename}`);
        await downloadFile(image.url, outputPath);
        downloadedCount++;

        // Add small delay to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`   ❌ Failed: ${filename} - ${error.message}`);
        failedCount++;
        failedDownloads.push({
          user: user.username || user.email,
          filename: filename,
          url: image.url,
          error: error.message,
        });
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 DOWNLOAD SUMMARY");
  console.log("=".repeat(80));
  console.log(`✅ Successfully downloaded: ${downloadedCount}`);
  console.log(`⏭️  Skipped (already exists): ${skippedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`📁 Output directory: ${path.resolve(OUTPUT_DIR)}`);

  if (failedDownloads.length > 0) {
    console.log("\n❌ Failed Downloads:");
    failedDownloads.forEach((fail, idx) => {
      console.log(`   ${idx + 1}. ${fail.user} - ${fail.filename}`);
      console.log(`      URL: ${fail.url}`);
      console.log(`      Error: ${fail.error}`);
    });

    // Save failed downloads to file
    const failedFile = path.join(OUTPUT_DIR, "failed-downloads.json");
    fs.writeFileSync(failedFile, JSON.stringify(failedDownloads, null, 2));
    console.log(`\n💾 Failed downloads saved to: ${failedFile}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ Download completed!");
  console.log("=".repeat(80) + "\n");
}

// Run the script
downloadAllImages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Fatal error:", error.message);
    console.error(error.stack);
    process.exit(1);
  });
