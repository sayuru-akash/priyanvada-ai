# Database Architecture Changes

This application now uses a **hybrid database setup** for optimal performance and cost efficiency:

## Current Architecture

### 🔐 Supabase (Authentication Layer)

- User authentication and session management
- User profiles and account data
- OAuth integrations (Google, etc.)
- Built-in security with Row Level Security (RLS)

### 🗄️ PostgreSQL (Data Layer)

- Characters and character data
- Chat sessions and conversation history
- Messages and chat content
- Chat memory and summaries

## Benefits

1. **Cost Optimization**: Use Supabase's generous free tier for auth while using cheaper PostgreSQL for data storage
2. **Performance**: Direct PostgreSQL queries without Supabase API overhead
3. **Flexibility**: Full control over data queries and database optimization
4. **Scalability**: Independent scaling of auth and data layers
5. **Vendor Independence**: Less vendor lock-in with hybrid approach

## Setup

1. **Configure Supabase**: Keep existing Supabase project for authentication
2. **Set up PostgreSQL**: Create a new PostgreSQL database (local or hosted)
3. **Run migrations**: Execute the provided SQL scripts
4. **Update environment**: Add PostgreSQL connection string

## Testing

Run the database test suite to verify your setup:

```bash
npm run test:db
```

This will test both Supabase authentication and PostgreSQL data operations.

## Environment Variables

```env
# Supabase (Authentication)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# PostgreSQL (Data)
POSTGRES_CONNECTION_STRING=postgresql://user:pass@host:port/db
```

The application will continue to work exactly the same way from a user perspective, but with improved performance and cost efficiency.
