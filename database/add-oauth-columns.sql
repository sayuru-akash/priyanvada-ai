-- Migration: Add OAuth support columns to users table
-- Run this in your Supabase SQL Editor to add missing columns for Google OAuth

-- Add avatar_url and google_id columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS google_id VARCHAR;

-- Create index on google_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id);

-- Update the handle_new_user function to handle the new columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into users table, bypassing RLS because this function is SECURITY DEFINER
    -- Note: google_id is handled separately by the OAuth flow, not by this trigger
    INSERT INTO public.users (id, username, email, full_name, avatar_url, last_login)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email, 'user_' || NEW.id::text),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        last_login = EXCLUDED.last_login,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the update_user_metadata function to handle the new columns
CREATE OR REPLACE FUNCTION public.update_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users
    SET 
        email = NEW.email,
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', users.full_name),
        avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', users.avatar_url),
        updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY column_name;

SELECT 'OAuth columns added successfully!' as status;