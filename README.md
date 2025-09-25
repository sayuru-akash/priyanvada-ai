# 🤖 Priyanvada AI - Advanced Character Chat Platform

<div align="center">
  <img src="./public/images/logo.png" alt="Priyanvada AI Logo" width="120" height="120" style="border-radius: 20px"/>
  
  **මොහාන්ගේ ලෝකයට පිවිසෙමු.. (Welcome to Mohan's World..)**
  
  [![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19.1.0-blue)](https://reactjs.org/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)](https://postgresql.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Auth-green)](https://supabase.com/)
  [![Google Gemini](https://img.shields.io/badge/Google_Gemini_AI-Powered-orange)](https://ai.google.dev/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC)](https://tailwindcss.com/)
</div>

## 📖 Overview

Priyanvada AI is a sophisticated character-based chat platform that allows users to interact with AI-powered characters. Built with cutting-edge technology, it features a hybrid database architecture, multi-language support (including Sinhala), and advanced AI conversation capabilities powered by Google's Gemini AI models.

### 🎯 Key Features

- **🎭 Character-Based Conversations**: Chat with diverse AI characters, each with unique personalities and backstories
- **🧠 Advanced AI Integration**: Powered by Google Gemini AI (2.5-Pro, 1.5-Pro, 1.5-Flash) with fallback mechanisms
- **🌍 Multi-Language Support**: Full support for Sinhala, English, and mixed-language conversations
- **🔐 Secure Authentication**: Google OAuth integration with Supabase authentication
- **💾 Hybrid Database Architecture**: Supabase for auth, PostgreSQL for data - optimized for performance and cost
- **📱 Responsive Design**: Modern UI with Material-UI components and TailwindCSS
- **🔄 Real-time Chat**: Seamless chat experience with session management
- **📊 Character Gallery**: Browse and discover characters with detailed profiles
- **🛠 Admin Tools**: Character creation and management capabilities

## 🏗 Architecture

### Database Architecture
```
┌─────────────────┐    ┌─────────────────┐
│   SUPABASE      │    │   POSTGRESQL    │
│                 │    │                 │
│ • User Auth     │    │ • Characters    │
│ • User Profiles │    │ • Chat Sessions │
│ • OAuth Data    │    │ • Messages      │
│ • Session Mgmt  │    │ • Chat Memory   │
└─────────────────┘    └─────────────────┘
```

### Technology Stack

**Frontend & Framework**
- **Next.js 15.5.2** - React framework with App Router
- **React 19.1.0** - User interface library
- **Material-UI (MUI)** - Component library for modern UI
- **TailwindCSS 4** - Utility-first CSS framework
- **React Markdown** - Markdown rendering for rich text

**Backend & API**
- **Next.js API Routes** - Server-side API endpoints
- **Google Gemini AI** - Multiple model support (2.5-Pro, 1.5-Pro, 1.5-Flash)
- **PostgreSQL** - Primary database for application data
- **Supabase** - Authentication and user management

**Authentication & Security**
- **Google OAuth 2.0** - Social authentication
- **Supabase Auth** - User session management
- **Row Level Security (RLS)** - Database-level security

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL** database (local or hosted)
- **Supabase** project for authentication
- **Google Cloud** project with OAuth and Gemini AI setup

### Environment Setup

1. **Clone the repository**
```bash
git clone https://github.com/dilukshashamal/priyanvada-ai.git
cd priyanvada-ai
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration**

Create `.env.local` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name

# Supabase Configuration (Authentication)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google Configuration
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_API_KEY=your-google-gemini-api-key

# Application Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

### Database Setup

1. **PostgreSQL Setup**
```bash
# Run the PostgreSQL setup script
psql "your_postgresql_connection_string" -f database/postgres-setup.sql
```

2. **Supabase Setup**
```bash
# Run the Supabase setup script (optional - for auth tables)
# Execute database/complete-setup.sql in your Supabase SQL editor
```

3. **Test Database Connection**
```bash
npm run test:postgres
```

### Running the Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000` to access the application.

## 📁 Project Structure

```
priyanvada-ai/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── google/           # Google OAuth
│   │   │   ├── login/            # Login endpoint
│   │   │   └── register/         # Registration endpoint
│   │   ├── characters/           # Character CRUD operations
│   │   ├── chat/                 # Chat AI endpoint
│   │   └── sessions/             # Session management
│   ├── components/               # React Components
│   │   ├── AuthComponent.js      # Authentication UI
│   │   ├── CharacterGallery.js   # Character browser
│   │   ├── ChatApp.js            # Main chat application
│   │   ├── ChatInterface.js      # Chat UI component
│   │   ├── ChatSidebar.js        # Sidebar navigation
│   │   └── UserSetup.js          # User profile setup
│   ├── contexts/                 # React Context providers
│   │   └── AuthContext.js        # Authentication context
│   ├── globals.css               # Global styles
│   ├── layout.js                 # Root layout
│   └── page.js                   # Home page
├── lib/                          # Utility libraries
│   ├── database.js               # Hybrid database service
│   ├── postgres.js               # PostgreSQL connection
│   ├── aiService.js              # Google Gemini AI integration
│   └── auth.js                   # Authentication helpers
├── config/                       # Configuration files
│   ├── instructions.js           # AI instruction templates
│   └── instructions.json         # Instruction configurations
├── database/                     # Database schemas
│   ├── complete-setup.sql        # Supabase setup
│   └── postgres-setup.sql        # PostgreSQL setup
├── scripts/                      # Utility scripts
│   ├── test-database.js          # Database testing
│   ├── test-postgres.js          # PostgreSQL testing
│   └── migrate-characters.js     # Data migration tools
└── public/                       # Static assets
    └── images/                   # Image assets
```

## 🎭 Character System

### Character Creation
Characters in Priyanvada AI are AI entities with:
- **Unique Personalities** - Distinct character traits and behaviors
- **Backstories** - Rich narrative backgrounds
- **Custom Greetings** - Personalized conversation starters
- **Example Messages** - Sample interactions to guide AI responses
- **Multi-language Support** - Characters can communicate in multiple languages

### Character Types
- **Public Characters** - Available to all users
- **Private Characters** - User-specific characters
- **Featured Characters** - Highlighted characters with special stories

### Character Management
- Browse character gallery with search and filtering
- View character details and conversation history
- Track chat statistics per character
- Create and customize personal characters (admin feature)

## 🔧 API Reference

### Authentication Endpoints
- `GET /api/auth/google` - Google OAuth initiation
- `GET /api/auth/google/callback` - OAuth callback handler
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user info

### Character Endpoints
- `GET /api/characters` - List characters with filtering
- `GET /api/characters/[id]` - Get specific character
- `POST /api/characters` - Create new character (admin)
- `PUT /api/characters/[id]` - Update character (admin)

### Chat Endpoints
- `POST /api/chat` - Send message and get AI response
- `GET /api/sessions` - Get user chat sessions
- `POST /api/sessions` - Create new chat session
- `DELETE /api/sessions/[id]` - Delete chat session
- `GET /api/sessions/[id]` - Get session messages

## 🛠 Development Tools

### Testing & Validation
```bash
# Test database connections
npm run test:db          # Full database test
npm run test:postgres    # PostgreSQL-specific test

# Database migration tools
npm run migrate:characters:dry-run   # Preview character migration
npm run migrate:characters          # Run character migration
npm run migrate:retry-failed        # Retry failed migrations
```

### Debugging & Monitoring
- Comprehensive error logging
- AI model fallback mechanisms
- Database connection pooling
- Performance monitoring with request timing

## 🌟 Advanced Features

### AI Integration
- **Multi-Model Support**: Automatic fallback between Gemini models
- **Context-Aware Responses**: Character personality integration
- **Conversation Memory**: Session-based context retention
- **Error Recovery**: Robust handling of API failures
- **Rate Limiting**: Built-in request management

### Database Optimization
- **Hybrid Architecture**: Optimal resource allocation
- **Connection Pooling**: Efficient database connections
- **Indexing Strategy**: Optimized query performance
- **Migration Tools**: Seamless data migration utilities

### Security Features
- **OAuth Integration**: Secure Google authentication
- **Session Management**: Secure user sessions
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Secure cross-origin requests

## 🔧 Configuration

### AI Configuration (`config/instructions.js`)
```javascript
export const instructionsConfig = {
  systemInstructions: {
    default: {
      role: "AI Assistant",
      personality: "helpful, knowledgeable, and friendly",
      guidelines: [
        "Be concise but thorough",
        "Ask clarifying questions when needed",
        "Provide examples when explaining"
      ]
    }
  }
}
```

### Database Configuration
The application uses a hybrid database approach:
- **Supabase**: Handles authentication, user profiles, and OAuth data
- **PostgreSQL**: Stores application data (characters, chats, messages)

## 🚀 Deployment

### Environment-Specific Settings

**Production Environment**
```env
NODE_ENV=production
DATABASE_URL=your_production_postgresql_url
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
# ... other production variables
```

### Deployment Platforms
- **Vercel** (Recommended for Next.js)
- **Railway** (Full-stack deployment)
- **Heroku** (Container deployment)
- **DigitalOcean** (VPS deployment)

### Database Hosting
- **Neon** (PostgreSQL) - Recommended
- **Railway** (PostgreSQL)
- **Supabase** (Authentication only)
- **AWS RDS** (Enterprise PostgreSQL)

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new features
- Update documentation for API changes
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for advanced language model capabilities
- **Supabase** for authentication infrastructure
- **Next.js Team** for the amazing React framework
- **Material-UI** for beautiful React components
- **PostgreSQL** for robust database management

## 📞 Support

For support and questions:
- **Issues**: [GitHub Issues](https://github.com/dilukshashamal/priyanvada-ai/issues)
- **Email**: Support inquiries welcome
- **Documentation**: Check the `/docs` folder for detailed guides

---

<div align="center">
  <strong>Built with ❤️ by the Priyanvada AI Team </strong>
  <br><br>
  <img src="https://img.shields.io/badge/Made%20with-Next.js-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/Powered%20by-Google%20Gemini-orange?style=for-the-badge&logo=google" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL-blue?style=for-the-badge&logo=postgresql" />
</div>
