#!/usr/bin/env node

/**
 * Test Cloudinary configuration and upload functionality
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { uploadImage, deleteImage } from "../lib/cloudinary.js";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env.local") });

async function testCloudinarySetup() {
  console.log("🔧 Testing Cloudinary Configuration...");

  // Check environment variables
  const requiredEnvVars = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];

  console.log("\n📋 Environment Variables:");
  let missingVars = [];

  requiredEnvVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 8)}...`);
    } else {
      console.log(`❌ ${varName}: Missing`);
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.log(
      `\n❌ Missing required environment variables: ${missingVars.join(", ")}`
    );
    return;
  }

  try {
    // Create a simple test image buffer (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xff, 0xff, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    console.log("\n🔄 Testing image upload...");
    const uploadResult = await uploadImage(
      testImageBuffer,
      "test-image.png",
      "image/png"
    );

    console.log("✅ Upload successful!");
    console.log(`  📁 Public ID: ${uploadResult.public_id}`);
    console.log(`  🔗 URL: ${uploadResult.secure_url}`);
    console.log(`  📏 Size: ${uploadResult.width}x${uploadResult.height}`);
    console.log(`  📦 Format: ${uploadResult.format}`);
    console.log(`  🗂️  Bytes: ${uploadResult.bytes}`);

    // Test deletion
    console.log("\n🗑️  Testing image deletion...");
    const deleteResult = await deleteImage(uploadResult.public_id);

    if (deleteResult.result === "ok") {
      console.log("✅ Deletion successful!");
    } else {
      console.log("⚠️  Deletion result:", deleteResult);
    }

    console.log(
      "\n🎉 All Cloudinary tests passed! Image upload functionality is working correctly."
    );
  } catch (error) {
    console.error("\n❌ Cloudinary test failed:", error);
    if (error.error && error.error.message) {
      console.error("   Error details:", error.error.message);
    }
    if (error.error && error.error.http_code) {
      console.error("   HTTP Code:", error.error.http_code);
    }
  }
}

// Run the test
testCloudinarySetup().catch((error) => {
  console.error("💥 Test execution failed:", error);
  process.exit(1);
});
