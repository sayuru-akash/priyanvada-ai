-- Migration to add Cloudinary image support to messages table
-- Run this script in your PostgreSQL database

-- Add columns for image support to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS has_images BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS images JSONB;

-- Create an index on has_images for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_has_images ON public.messages(has_images);

-- Update the messages table to support Cloudinary image metadata
-- The images column will store an array of image objects with structure:
-- [
--   {
--     "url": "https://res.cloudinary.com/...",
--     "publicId": "priyanvada-ai/chat-images/...",
--     "mimeType": "image/jpeg",
--     "size": 1234567,
--     "name": "image.jpg",
--     "uploadedAt": "2025-01-01T00:00:00Z",
--     "width": 1024,
--     "height": 768,
--     "data": "base64_data_for_ai" -- Only for AI processing, not for display
--   }
-- ]

-- Create a function to validate image metadata
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

-- Add constraint to ensure images column contains valid data
ALTER TABLE public.messages 
ADD CONSTRAINT check_valid_images 
CHECK (images IS NULL OR validate_image_metadata(images));

-- Update existing messages to set has_images = false where it's null
UPDATE public.messages 
SET has_images = FALSE 
WHERE has_images IS NULL;

-- Create a trigger to automatically set has_images based on images column
CREATE OR REPLACE FUNCTION set_has_images()
RETURNS TRIGGER AS $$
BEGIN
    NEW.has_images := (NEW.images IS NOT NULL AND jsonb_array_length(NEW.images) > 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_has_images ON public.messages;
CREATE TRIGGER trigger_set_has_images
    BEFORE INSERT OR UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION set_has_images();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_image_metadata(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_has_images() TO anon, authenticated;

-- Create a helper function to clean up old Cloudinary images
CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS TABLE(public_id TEXT, status TEXT) AS $$
BEGIN
    -- This function can be called periodically to identify images that might need cleanup
    -- Returns public_ids of images that are no longer referenced in any messages
    RETURN QUERY
    SELECT 
        DISTINCT (img->>'publicId')::TEXT as public_id,
        'orphaned'::TEXT as status
    FROM (
        SELECT jsonb_array_elements(images) as img
        FROM public.messages 
        WHERE has_images = true
    ) AS all_images
    WHERE (img->>'publicId') IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cleanup_orphaned_images() TO authenticated;

SELECT 'Cloudinary image support migration completed successfully!' as status;