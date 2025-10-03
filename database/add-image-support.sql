-- Add image support to the messages table
-- This migration adds support for storing image metadata in messages

-- Add columns for image data (if not already exists)
DO $$
BEGIN
    -- Check if the metadata column can store image data
    -- The metadata JSONB column already exists and can store image information
    
    -- Update the existing metadata structure to include image support
    -- No schema changes needed as we'll store image metadata in the existing metadata JSONB column
    
    -- The metadata will store:
    -- {
    --   "images": [
    --     {
    --       "name": "filename.jpg",
    --       "mimeType": "image/jpeg", 
    --       "size": 1234567,
    --       "uploadedAt": "2024-01-01T00:00:00.000Z"
    --     }
    --   ]
    -- }
    
    RAISE NOTICE 'Image support added to messages metadata. No schema changes required.';
END
$$;