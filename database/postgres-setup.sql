-- PostgreSQL Database Setup Script for Data Tables
-- This script sets up only the data tables (characters, chat_sessions, messages, chat_memory)
-- User authentication and user profiles remain in Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create characters table
CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL, -- This will reference the Supabase user ID
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    book_name VARCHAR
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- This will reference the Supabase user ID
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    title VARCHAR DEFAULT 'New Chat',
    is_archived BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'live' CHECK (status IN ('live', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    token_count INTEGER,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_memory table
CREATE TABLE IF NOT EXISTS chat_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    summary TEXT,
    key_points JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_characters_creator_id ON characters(creator_id);
CREATE INDEX IF NOT EXISTS idx_characters_is_public ON characters(is_public);
CREATE INDEX IF NOT EXISTS idx_characters_is_active ON characters(is_active);
CREATE INDEX IF NOT EXISTS idx_characters_created_at ON characters(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_character_id ON chat_sessions(character_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_is_archived ON chat_sessions(is_archived);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

CREATE INDEX IF NOT EXISTS idx_chat_memory_session_id ON chat_memory(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_memory_created_at ON chat_memory(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at columns
CREATE TRIGGER update_characters_updated_at
    BEFORE UPDATE ON characters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify setup
SELECT 'PostgreSQL data tables setup completed successfully!' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('characters', 'chat_sessions', 'messages', 'chat_memory')
ORDER BY table_name;