-- Complete Supabase Database Setup Script
-- Run this in the Supabase SQL Editor after creating a new project

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table (compatible with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR UNIQUE NOT NULL,
    email VARCHAR,
    full_name VARCHAR,
    avatar_url TEXT,
    google_id VARCHAR,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create characters table
CREATE TABLE IF NOT EXISTS public.characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    title VARCHAR,
    description TEXT,
    personality TEXT,
    scenario TEXT,
    greeting TEXT,
    example_messages JSONB,
    tags TEXT[],
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    chat_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
    title VARCHAR DEFAULT 'New Chat',
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    token_count INTEGER,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_memory table
CREATE TABLE IF NOT EXISTS public.chat_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    summary TEXT,
    key_points JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id);
CREATE INDEX IF NOT EXISTS idx_characters_creator_id ON public.characters(creator_id);
CREATE INDEX IF NOT EXISTS idx_characters_is_public ON public.characters(is_public);
CREATE INDEX IF NOT EXISTS idx_characters_is_active ON public.characters(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_character_id ON public.chat_sessions(character_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON public.messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_memory_session_id ON public.chat_memory(session_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_memory ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "System can insert users" ON public.users;

-- Users can only see and edit their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Allow the system to insert users (for the trigger function)
CREATE POLICY "System can insert users" ON public.users
    FOR INSERT WITH CHECK (true);

-- Characters policies
DROP POLICY IF EXISTS "Anyone can view public characters" ON public.characters;
DROP POLICY IF EXISTS "Users can view own characters" ON public.characters;
DROP POLICY IF EXISTS "Users can create characters" ON public.characters;
DROP POLICY IF EXISTS "Users can update own characters" ON public.characters;
DROP POLICY IF EXISTS "Users can delete own characters" ON public.characters;

CREATE POLICY "Anyone can view public characters" ON public.characters
    FOR SELECT USING (is_public = true AND is_active = true);

CREATE POLICY "Users can view own characters" ON public.characters
    FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Users can create characters" ON public.characters
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own characters" ON public.characters
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own characters" ON public.characters
    FOR DELETE USING (auth.uid() = creator_id);

-- Chat sessions policies
DROP POLICY IF EXISTS "Users can view own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can create own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON public.chat_sessions;

CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions" ON public.chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions" ON public.chat_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages from own sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in own sessions" ON public.messages;

CREATE POLICY "Users can view messages from own sessions" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions 
            WHERE chat_sessions.id = messages.session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in own sessions" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_sessions 
            WHERE chat_sessions.id = messages.session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- Chat memory policies
DROP POLICY IF EXISTS "Users can view memory from own sessions" ON public.chat_memory;
DROP POLICY IF EXISTS "Users can create memory for own sessions" ON public.chat_memory;

CREATE POLICY "Users can view memory from own sessions" ON public.chat_memory
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions 
            WHERE chat_sessions.id = chat_memory.session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create memory for own sessions" ON public.chat_memory
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_sessions 
            WHERE chat_sessions.id = chat_memory.session_id 
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- Create a function to handle user creation trigger
-- This function runs with SECURITY DEFINER and bypasses RLS
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

-- Create trigger to automatically create user profile when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to update user metadata
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

-- Create trigger to update user profile when auth user is updated
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.update_user_metadata();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Test data (optional - remove if not needed)
-- This will only work after you create your first user through the app
-- INSERT INTO public.characters (creator_id, name, title, description, personality, greeting, is_public)
-- VALUES (
--     '00000000-0000-0000-0000-000000000000', -- Replace with real user ID after registration
--     'Assistant',
--     'Helpful AI Assistant',
--     'A friendly and helpful AI assistant',
--     'Helpful, knowledgeable, and friendly',
--     'Hello! How can I help you today?',
--     true
-- );

-- Verify setup
SELECT 'Setup completed successfully!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
