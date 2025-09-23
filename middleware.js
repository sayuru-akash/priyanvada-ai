// Middleware is not needed for this implementation since we handle
// authentication at the component level and use Supabase RLS for database security.
// The API routes receive userId as parameters and the database policies
// ensure users can only access their own data.

export function middleware(request) {
  // Currently no middleware needed - authentication handled by:
  // 1. Client-side auth context
  // 2. Supabase RLS policies
  // 3. API route parameter validation
  return;
}

export const config = {
  matcher: [],
};
