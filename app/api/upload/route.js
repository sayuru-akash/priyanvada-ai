import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "../../../lib/cloudinary.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Please upload an image smaller than 10MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const cloudinaryResult = await uploadImage(buffer, file.name, file.type);

    // Create response with Cloudinary data
    const imageData = {
      // Store Cloudinary URL instead of base64 data
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      mimeType: file.type,
      size: file.size,
      name: file.name,
      uploadedAt: new Date().toISOString(),
      // Keep base64 for immediate use in AI (if needed)
      data: buffer.toString("base64"),
    };

    return NextResponse.json({
      success: true,
      image: imageData,
      cloudinary: {
        public_id: cloudinaryResult.public_id,
        secure_url: cloudinaryResult.secure_url,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        format: cloudinaryResult.format,
        bytes: cloudinaryResult.bytes,
      },
      message: "Image uploaded successfully to Cloudinary",
    });
  } catch (error) {
    console.error("Upload API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload image",
        details: error.message,
        cloudinaryError: error.error || null,
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
