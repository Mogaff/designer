# Cursor IDE Setup Guide

## Quick Setup for Development

### 1. Clone and Install
```bash
git clone <repository-url>
cd ai-design-platform
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Edit `.env` with your credentials (see sections below).

### 3. Database Setup
```bash
# For local PostgreSQL
createdb ai_design_platform

# Update DATABASE_URL in .env
# Push schema
npm run db:push
```

### 4. Start Development
```bash
npm run dev
```

## Essential API Keys (Get These First)

### Firebase (Authentication)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create project → Add web app
3. Enable Authentication → Email/Password + Google
4. Add `localhost` to Authorized domains
5. Copy keys to `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_PROJECT_ID` 
   - `VITE_FIREBASE_APP_ID`

### OpenAI (Required for AI generation)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create API key
3. Add to `OPENAI_API_KEY`

### Google Gemini (Required for AI generation)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Add to `GEMINI_API_KEY`

### Claude (Required for AI generation)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create API key
3. Add to `ANTHROPIC_API_KEY`

### Fal AI (Image generation)
1. Go to [Fal AI](https://fal.ai/dashboard)
2. Create API key
3. Add to `FAL_KEY`

## Database Options

### Option 1: Local PostgreSQL
```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# Start service
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Ubuntu

# Create database
createdb ai_design_platform
```

### Option 2: Cloud Database (Recommended)
- **Neon** (Free tier): https://neon.tech/
- **Supabase** (Free tier): https://supabase.com/
- **Railway**: https://railway.app/

## Cursor IDE Configuration

### Recommended Extensions
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- GitLens

### Workspace Settings
Add to `.vscode/settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "tailwindCSS.includeLanguages": {
    "typescript": "typescript",
    "typescriptreact": "typescriptreact"
  }
}
```

## Development Workflow

### 1. Start Development Server
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### 2. Database Management
```bash
# View current schema
npm run db:studio

# Push schema changes
npm run db:push

# Generate migration files
npm run db:generate
```

### 3. Testing Authentication
1. Open http://localhost:5173
2. Click "Login"
3. Test Google login (requires Firebase setup)
4. Test email registration

### 4. Testing AI Generation
1. Login to the app
2. Go to design creation
3. Enter a prompt like "Create a modern tech conference flyer"
4. Verify AI generation works

## Common Issues & Solutions

### Firebase Authentication
**Issue**: Domain not authorized
**Solution**: Add `localhost` to Firebase Console > Authentication > Settings > Authorized domains

**Issue**: Popup blocked
**Solution**: Allow popups for localhost in browser settings

### Database Connection
**Issue**: Connection refused
**Solution**: Check if PostgreSQL is running and DATABASE_URL is correct

### API Keys
**Issue**: 401 Unauthorized
**Solution**: Verify API keys are active and have correct permissions

### Build Errors
**Issue**: TypeScript errors
**Solution**: 
```bash
npm run type-check
npx tsc --noEmit
```

## Project Structure Overview

```
├── client/src/           # React frontend
│   ├── components/       # UI components
│   ├── pages/           # Route pages
│   ├── contexts/        # React contexts
│   ├── lib/            # Utilities
│   └── firebase.ts     # Firebase config
├── server/             # Express backend
│   ├── services/       # AI integrations
│   ├── routes.ts       # API routes
│   ├── db.ts          # Database
│   └── auth.ts        # Authentication
├── shared/schema.ts    # Database schema
└── templates/         # Design templates
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run db:push      # Push schema to database
npm run db:studio    # Open database studio
npm run db:generate  # Generate migrations
npm run type-check   # Check TypeScript
```

## Feature Testing Checklist

- [ ] User registration/login works
- [ ] Google authentication works
- [ ] AI design generation works
- [ ] Template browser loads
- [ ] Image upload functions
- [ ] Design editor responsive
- [ ] Export functionality works
- [ ] Credit system functional

## Production Deployment

### Environment Variables for Production
- Update all API keys for production
- Set `NODE_ENV=production`
- Configure production database
- Add production domain to Firebase

### Build Command
```bash
npm run build
```

## Support

For development issues:
1. Check this guide first
2. Verify all API keys are set
3. Check console logs for errors
4. Test with minimal example

The application should run successfully once all API keys are configured and the database is connected.