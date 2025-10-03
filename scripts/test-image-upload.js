// Test script for image upload functionality
// Run with: node scripts/test-image-upload.js

const fs = require("fs");
const path = require("path");

async function testImageUpload() {
  console.log("🧪 Testing Image Upload Functionality...\n");

  const testCases = [
    {
      name: "Valid JPEG upload",
      file: createTestImageBuffer("image/jpeg"),
      expectedSuccess: true,
    },
    {
      name: "Valid PNG upload",
      file: createTestImageBuffer("image/png"),
      expectedSuccess: true,
    },
    {
      name: "Invalid file type",
      file: Buffer.from("not an image"),
      contentType: "text/plain",
      expectedSuccess: false,
    },
    {
      name: "Large file (simulated)",
      file: Buffer.alloc(11 * 1024 * 1024), // 11MB
      contentType: "image/jpeg",
      expectedSuccess: false,
    },
  ];

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    try {
      const result = await uploadImage(
        testCase.file,
        testCase.contentType || "image/jpeg"
      );

      if (testCase.expectedSuccess && result.success) {
        console.log("✅ PASS - Upload successful");
      } else if (!testCase.expectedSuccess && !result.success) {
        console.log("✅ PASS - Upload correctly rejected");
      } else {
        console.log("❌ FAIL - Unexpected result");
        console.log("Result:", result);
      }
    } catch (error) {
      if (!testCase.expectedSuccess) {
        console.log("✅ PASS - Upload correctly failed");
      } else {
        console.log("❌ FAIL - Unexpected error");
        console.log("Error:", error.message);
      }
    }
    console.log("");
  }
}

async function uploadImage(buffer, contentType) {
  const FormData = require("form-data");
  const fetch = require("node-fetch");

  const formData = new FormData();
  formData.append("image", buffer, {
    filename: "test-image.jpg",
    contentType: contentType,
  });

  const response = await fetch("http://localhost:3000/api/upload", {
    method: "POST",
    body: formData,
  });

  return await response.json();
}

function createTestImageBuffer(mimeType) {
  // Create a minimal valid image buffer for testing
  if (mimeType === "image/jpeg") {
    // Minimal JPEG header
    return Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xd9,
    ]);
  } else if (mimeType === "image/png") {
    // Minimal PNG header
    return Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x57, 0x63, 0xf8, 0x0f, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x5c, 0xdd, 0x8d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
  }
  return Buffer.alloc(100); // Default small buffer
}

// Check if we need to install dependencies
try {
  require("form-data");
  require("node-fetch");
  testImageUpload().catch(console.error);
} catch (error) {
  console.log("📦 Installing test dependencies...");
  console.log("Run: npm install form-data node-fetch --save-dev");
  console.log("Then run this test again.");
}
