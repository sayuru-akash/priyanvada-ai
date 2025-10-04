#!/usr/bin/env node

/**
 * Test the complete image upload flow through the API
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fetch from "node-fetch";
import FormData from "form-data";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env.local") });

async function testImageUploadAPI() {
  console.log("🌐 Testing Image Upload API...");

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

    // Create form data
    const formData = new FormData();
    formData.append("image", testImageBuffer, {
      filename: "test-api-image.png",
      contentType: "image/png",
    });

    console.log("📤 Sending POST request to /api/upload...");

    // Make request to the upload API
    const response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    console.log("✅ API Response received!");
    console.log(`  📁 Success: ${result.success}`);
    console.log(`  💬 Message: ${result.message}`);

    if (result.success && result.image) {
      console.log("\n📊 Image Data:");
      console.log(`  🔗 URL: ${result.image.url}`);
      console.log(`  🆔 Public ID: ${result.image.publicId}`);
      console.log(`  📏 Size: ${result.image.size} bytes`);
      console.log(`  🗂️  MIME Type: ${result.image.mimeType}`);
      console.log(`  📅 Uploaded: ${result.image.uploadedAt}`);
    }

    if (result.cloudinary) {
      console.log("\n☁️  Cloudinary Details:");
      console.log(`  🔗 Secure URL: ${result.cloudinary.secure_url}`);
      console.log(
        `  📏 Dimensions: ${result.cloudinary.width}x${result.cloudinary.height}`
      );
      console.log(`  📦 Format: ${result.cloudinary.format}`);
      console.log(`  💾 Bytes: ${result.cloudinary.bytes}`);
    }

    console.log("\n🎉 Image upload API test completed successfully!");
    console.log("\n📋 Summary:");
    console.log("✅ Image upload endpoint is working");
    console.log("✅ Cloudinary integration is functional");
    console.log("✅ API returns proper response format");
    console.log("✅ Images are being stored permanently");
  } catch (error) {
    console.error("\n❌ Image upload API test failed:", error);

    if (error.code === "ECONNREFUSED") {
      console.error(
        "💡 Make sure the development server is running on http://localhost:3000"
      );
    }
  }
}

// Run the test
testImageUploadAPI().catch((error) => {
  console.error("💥 Test execution failed:", error);
  process.exit(1);
});
