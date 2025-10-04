// CommonJS wrapper for Cloudinary (for Node.js scripts)
const { v2: cloudinary } = require("cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image buffer to Cloudinary
 * @param {Buffer} buffer - Image buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @returns {Promise<Object>} Cloudinary upload result
 */
async function uploadImage(buffer, fileName, mimeType) {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "priyanvada-ai/chat-images",
          public_id: `${Date.now()}_${fileName.replace(/\.[^/.]+$/, "")}`,
          format: "webp",
          quality: "auto:good",
          fetch_format: "auto",
          transformation: [
            { width: 1024, height: 1024, crop: "limit" },
            { quality: "auto:good" },
          ],
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
}

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Deletion result
 */
async function deleteImage(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
    return result;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
}

/**
 * Get optimized image URL with transformations
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} Optimized image URL
 */
function getOptimizedImageUrl(publicId, options = {}) {
  const defaultOptions = {
    fetch_format: "auto",
    quality: "auto:good",
    ...options,
  };

  return cloudinary.url(publicId, defaultOptions);
}

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  getOptimizedImageUrl,
};
