# Copilot Instructions for Priyanvada AI

## Project Overview

Priyanvada AI is a character-based AI chat platform built with **Next.js 15** (App Router). Users interact with AI-powered characters—each with unique personalities, backstories, and multi-language support (including Sinhala and English). The AI is powered by **Google Gemini** (2.5-Pro, 1.5-Pro, 1.5-Flash with automatic fallback). The app uses a **hybrid database architecture**: Supabase for authentication and PostgreSQL for application data.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| UI | React 19, Material-UI (MUI) v7, TailwindCSS v4 |
| AI | Google Gemini AI (`@google/generative-ai`) |
| Auth | Supabase Auth + Google OAuth 2.0 |
| Database (auth) | Supabase (PostgreSQL via hosted service) |
| Database (data) | PostgreSQL (`pg` driver — Neon, Railway, etc.) |
| Image uploads | Cloudinary |
| Language | JavaScript (ESM, no TypeScript) |
| Linter | ESLint 9 (`eslint-config-next`) |

---

## Repository Structure

```
priyanvada-ai/
├── app/                        # Next.js App Router
│   ├── api/                    # API route handlers (Next.js Route Handlers)
│   │   ├── auth/               # Google OAuth + Supabase auth endpoints
│   │   ├── characters/         # Character CRUD
│   │   ├── chat/               # AI chat endpoint (calls Google Gemini)
│   │   ├── sessions/           # Chat session management
│   │   ├── paid-plan-interest/ # Credit-exhaustion interest collection
│   │   └── upload/             # Cloudinary image upload
│   ├── components/             # Shared React components (client-side)
│   ├── contexts/               # React Context (AuthContext)
│   ├── priyaadmin/             # Admin panel pages
│   ├── priyanvadaadminlogin/   # Admin login page
│   ├── globals.css             # Global styles (TailwindCSS)
│   ├── layout.js               # Root layout (AuthProvider wrapper)
│   └── page.js                 # Home page
├── lib/                        # Shared server-side utilities
│   ├── database.js             # Hybrid DB service (Supabase + PostgreSQL)
│   ├── postgres.js             # Raw pg pool/connection helpers
│   ├── aiService.js            # Google Gemini integration + fallback logic
│   └── auth.js                 # Authentication helpers
├── config/
│   ├── instructions.js         # AI instruction template exports
│   └── instructions.json       # AI model/UI configuration
├── database/                   # SQL migration scripts
│   ├── postgres-setup.sql      # PostgreSQL schema
│   └── complete-setup.sql      # Supabase schema
├── scripts/                    # Node.js utility/test scripts
├── public/                     # Static assets (images, icons)
├── middleware.js               # Next.js middleware (route protection)
├── next.config.mjs
├── eslint.config.mjs
└── .env.example                # Template for environment variables
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values. The critical variables are:

```env
# PostgreSQL (application data)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Supabase (authentication)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Google Gemini AI
GOOGLE_API_KEY=...

# App
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Credit system
NEXT_PUBLIC_REMAINING_CREDITS=10

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Admin panel
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
```

---

## Development Workflow

### Install & Run

```bash
npm install
npm run dev        # Starts Next.js dev server with Turbopack at http://localhost:3000
npm run build      # Production build (Turbopack)
npm start          # Start production server
npm run lint       # ESLint check
```

### Database Setup

```bash
# PostgreSQL schema
psql "$DATABASE_URL" -f database/postgres-setup.sql

# Credit system tables
npm run db:setup-credits

# Supabase schema — run database/complete-setup.sql in the Supabase SQL editor
```

### Testing & Diagnostics

```bash
npm run test:db              # Test both Supabase and PostgreSQL connections
npm run test:postgres        # Test PostgreSQL connection only
npm run test:credit-system   # Test credit system and paid plan interest

# Character migration tools
npm run migrate:characters:dry-run
npm run migrate:characters
npm run migrate:retry-failed
```

---

## Code Conventions

- **Language**: Plain JavaScript (`.js`), ES Modules (`import`/`export`). No TypeScript.
- **Next.js App Router**: All pages and API routes live under `app/`. Route handlers use the `export async function GET/POST/...` pattern.
- **Server vs Client components**: API routes and `lib/` utilities run server-side. Components under `app/components/` are client components (use `"use client"` directive where needed).
- **Database access**: Always go through `lib/database.js` (hybrid service) or `lib/postgres.js` (raw pool) — never create new `pg.Pool` instances outside these files.
- **AI calls**: All Gemini API calls go through `lib/aiService.js`. It handles model fallback (2.5-Pro → 1.5-Pro → 1.5-Flash) and error recovery automatically.
- **Auth**: Authentication state is managed via `app/contexts/AuthContext.js`. Supabase session is the source of truth. Use `lib/auth.js` helpers for server-side auth checks.
- **Styling**: TailwindCSS v4 utility classes for layout/spacing. MUI components for interactive UI elements (buttons, dialogs, form fields). Avoid mixing inline styles with Tailwind unless necessary.
- **Error handling**: API routes should return structured JSON errors with appropriate HTTP status codes. Log errors server-side; never expose stack traces to the client.
- **SQL queries**: Use parameterized queries (`$1`, `$2`, …) for all PostgreSQL queries — never string-interpolate user input.
- **Environment variables**: Server-only secrets must not be prefixed with `NEXT_PUBLIC_`. Public variables (accessible in the browser) must use the `NEXT_PUBLIC_` prefix.

---

## Key Architecture Notes

### Hybrid Database
- **Supabase** handles user authentication, OAuth, and user profile data.
- **PostgreSQL** (direct `pg` connection) stores all application data: characters, chat sessions, messages, and chat memory.
- `lib/database.js` provides a unified interface over both.

### AI Character System
- Characters have a `personality`, `backstory`, `greeting`, and `example_messages` that are injected into the Gemini system prompt at chat time.
- Chat memory is summarised after every 20 messages (`autoSummarizeAfter: 20`) to keep context windows manageable.
- AI model settings live in `config/instructions.json` (`maxTokens`, `temperature`, `topP`).

### Credit System
- Each user gets a configurable number of free credits (`NEXT_PUBLIC_REMAINING_CREDITS`).
- When credits are exhausted, users see a paid-plan interest modal (data stored in the `paid_plan_interest` PostgreSQL table).

### Admin Panel
- Protected routes under `/priyaadmin` (login at `/priyanvadaadminlogin`).
- Admin credentials are set via `ADMIN_USERNAME` / `ADMIN_PASSWORD` environment variables.
- Admins can create and manage characters.

---

## Testing Approach

There is no unit/integration test framework (e.g. Jest) configured. Validation is done via the Node.js scripts in `scripts/`:
- `test-database.js` — end-to-end DB connectivity check
- `test-postgres.js` — PostgreSQL-specific check
- `test-credit-system.js` — credit system validation

When adding new features, run the relevant test script and verify the dev server starts cleanly with `npm run dev`.

---

## Important Constraints

- Do **not** commit `.env.local` or any file containing real credentials.
- Do **not** add TypeScript or change the module system without discussion.
- Do **not** bypass the `lib/aiService.js` abstraction to call Gemini directly from route handlers.
- Do **not** use Supabase client for application data queries — use the PostgreSQL pool via `lib/postgres.js`.
- Keep character data seeded via SQL scripts in `database/` — not hardcoded in source files.
