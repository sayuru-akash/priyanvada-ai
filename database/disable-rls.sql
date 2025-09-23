-- Quick fix for RLS issues - Run this in Supabase SQL Editor
-- This disables Row Level Security temporarily for easier testing

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE characters DISABLE ROW LEVEL SECURITY; 
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_memory DISABLE ROW LEVEL SECURITY;

-- Test query to verify tables are accessible
SELECT 'users table' as table_name, count(*) as record_count FROM users
UNION ALL
SELECT 'characters table', count(*) FROM characters  
UNION ALL
SELECT 'chat_sessions table', count(*) FROM chat_sessions
UNION ALL
SELECT 'messages table', count(*) FROM messages
UNION ALL  
SELECT 'chat_memory table', count(*) FROM chat_memory;
