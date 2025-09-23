-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.characters (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  creator_id uuid,
  name character varying NOT NULL,
  title character varying,
  description text,
  personality text,
  scenario text,
  greeting text,
  example_messages jsonb,
  tags ARRAY,
  avatar_url text,
  is_public boolean DEFAULT false,
  is_active boolean DEFAULT true,
  chat_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT characters_pkey PRIMARY KEY (id),
  CONSTRAINT characters_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id)
);
CREATE TABLE public.chat_memory (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid,
  summary text,
  key_points jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_memory_pkey PRIMARY KEY (id),
  CONSTRAINT chat_memory_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id)
);
CREATE TABLE public.chat_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  character_id uuid,
  title character varying DEFAULT 'New Chat'::character varying,
  is_archived boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id),
  CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['user'::character varying, 'assistant'::character varying, 'system'::character varying]::text[])),
  content text NOT NULL,
  token_count integer,
  metadata jsonb,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  username character varying NOT NULL UNIQUE,
  email character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  full_name character varying,
  last_login timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);