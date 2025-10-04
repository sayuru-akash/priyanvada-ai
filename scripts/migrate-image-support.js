#!/usr/bin/env node
/**
 * Database Migration Script - Add Image Support
 * This script adds Cloudinary image support to the messages table
 */

require("dotenv").config({ path: ".env.local" });
const { Pool } = require("pg");

async function runImageMigration() {
  console.log("🗄️  Starting database migration for image support...\n");

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    // Check database connection
    console.log("🔌 Testing database connection...");
    await pool.query("SELECT NOW()");
    console.log("✅ Database connected successfully");

    // Check if columns already exist
    console.log("\n🔍 Checking existing table structure...");
    const existingColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      AND column_name IN ('has_images', 'images')
    `);

    if (existingColumns.rows.length >= 2) {
      console.log("✅ Image support columns already exist");
      console.log("🎉 Migration completed - no changes needed!");
      return;
    }

    // Run the migration
    console.log("\n🚀 Running migration...");

    // Add columns for image support
    console.log("📝 Adding has_images column...");
    await pool.query(`
      ALTER TABLE public.messages 
      ADD COLUMN IF NOT EXISTS has_images BOOLEAN DEFAULT FALSE
    `);

    console.log("📝 Adding images column...");
    await pool.query(`
      ALTER TABLE public.messages 
      ADD COLUMN IF NOT EXISTS images JSONB
    `);

    // Create index
    console.log("📝 Creating index on has_images...");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_has_images ON public.messages(has_images)
    `);

    // Create validation function
    console.log("📝 Creating image validation function...");
    await pool.query(`
      CREATE OR REPLACE FUNCTION validate_image_metadata(images_data JSONB)
      RETURNS BOOLEAN AS $$
      BEGIN
          -- Check if it's an array
          IF jsonb_typeof(images_data) != 'array' THEN
              RETURN FALSE;
          END IF;
          
          -- Check each image object has required fields
          RETURN (
              SELECT bool_and(
                  jsonb_typeof(img) = 'object' AND
                  img ? 'url' AND
                  img ? 'publicId' AND
                  img ? 'mimeType' AND
                  img ? 'uploadedAt'
              )
              FROM jsonb_array_elements(images_data) AS img
          );
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Add constraint
    console.log("📝 Adding validation constraint...");
    try {
      await pool.query(`
        ALTER TABLE public.messages 
        DROP CONSTRAINT IF EXISTS check_valid_images
      `);
      await pool.query(`
        ALTER TABLE public.messages 
        ADD CONSTRAINT check_valid_images 
        CHECK (images IS NULL OR validate_image_metadata(images))
      `);
    } catch (error) {
      console.log(
        "⚠️  Constraint already exists or validation function not ready, skipping..."
      );
    }

    // Update existing messages
    console.log("📝 Updating existing messages...");
    await pool.query(`
      UPDATE public.messages 
      SET has_images = FALSE 
      WHERE has_images IS NULL
    `);

    // Create trigger function
    console.log("📝 Creating trigger function...");
    await pool.query(`
      CREATE OR REPLACE FUNCTION set_has_images()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.has_images := (NEW.images IS NOT NULL AND jsonb_array_length(NEW.images) > 0);
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger
    console.log("📝 Creating trigger...");
    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_set_has_images ON public.messages;
      CREATE TRIGGER trigger_set_has_images
          BEFORE INSERT OR UPDATE ON public.messages
          FOR EACH ROW EXECUTE FUNCTION set_has_images();
    `);

    // Grant permissions
    console.log("📝 Granting permissions...");
    await pool.query(`
      GRANT EXECUTE ON FUNCTION validate_image_metadata(JSONB) TO anon, authenticated;
      GRANT EXECUTE ON FUNCTION set_has_images() TO anon, authenticated;
    `);

    console.log("\n🎉 Migration completed successfully!");
    console.log("✅ Image support has been added to the messages table");
    console.log("✅ All functions and triggers are in place");

    // Verify the migration
    console.log("\n🔍 Verifying migration...");
    const verifyColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
      AND column_name IN ('has_images', 'images')
      ORDER BY column_name
    `);

    console.log("📋 Added columns:");
    verifyColumns.rows.forEach((row) => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error("💡 Please check your database connection and permissions");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Only run if called directly
if (require.main === module) {
  runImageMigration().catch(console.error);
}

module.exports = { runImageMigration };
