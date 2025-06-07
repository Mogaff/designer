# AI-Powered Design Platform

An advanced AI-driven advertising design platform that leverages cutting-edge artificial intelligence to transform creative content generation for marketing professionals.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env

# Initialize database
npm run db:push

# Start development server
npm run dev
```

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, DaisyUI, Flowbite
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Auth (Google + Email/Password)
- **AI Services**: OpenAI GPT-4, Claude 3.5, Google Gemini
- **Animation**: GSAP, Framer Motion
- **Image Generation**: Flux AI, Fal AI
- **Additional**: Puppeteer, Stripe

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- Firebase project
- API keys for AI services

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
PGHOST=localhost
PGPORT=5432
PGDATABASE=database_name
PGUSER=username
PGPASSWORD=password

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id

# AI Service API Keys
OPENAI_API_KEY=sk-your_openai_key
ANTHROPIC_API_KEY=sk-ant-your_claude_key
GEMINI_API_KEY=AIza-your_gemini_key
FAL_KEY=your_fal_ai_key
ELEVENLABS_API_KEY=sk_your_elevenlabs_key
KLING_API_KEY=your_kling_key

# Stripe (Optional)
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
```

## 🔥 Firebase Setup (Critical)

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project or use existing
3. Enable Authentication

### 2. Configure Authentication

1. Navigate to **Authentication** → **Sign-in method**
2. Enable **Email/Password** and **Google** providers
3. For Google: Add OAuth 2.0 client ID

### 3. Add Authorized Domains

**CRITICAL**: Add your development/production domains to Firebase:

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your domains:
   - For Cursor: `localhost`
   - For Replit: `*.replit.dev`
   - For production: your custom domain

### 4. Get Configuration Keys

1. Go to **Project Settings** → **Your apps**
2. Add web app if not exists
3. Copy configuration values for `.env`:
   - `apiKey` → `VITE_FIREBASE_API_KEY`
   - `projectId` → `VITE_FIREBASE_PROJECT_ID`
   - `appId` → `VITE_FIREBASE_APP_ID`

## 🤖 AI Services Setup

### OpenAI
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create API key
3. Add to `OPENAI_API_KEY`

### Claude (Anthropic)
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create API key
3. Add to `ANTHROPIC_API_KEY`

### Google Gemini
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create API key
3. Add to `GEMINI_API_KEY`

### Fal AI (Image Generation)
1. Go to [Fal AI](https://fal.ai/)
2. Create account and API key
3. Add to `FAL_KEY`

## 💾 Database Setup

### Option 1: Local PostgreSQL
```bash
# Install PostgreSQL
# Create database
createdb your_database_name

# Update DATABASE_URL in .env
# Run migrations
npm run db:push
```

### Option 2: Hosted Database (Recommended)
- **Neon**: https://neon.tech/
- **Supabase**: https://supabase.com/
- **Railway**: https://railway.app/

## 🏗 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Route components
│   │   ├── contexts/      # React contexts
│   │   ├── lib/           # Utilities
│   │   └── firebase.ts    # Firebase config
├── server/                # Express backend
│   ├── services/          # AI service integrations
│   ├── routes.ts          # API routes
│   ├── db.ts             # Database connection
│   ├── storage.ts        # Data layer
│   └── auth.ts           # Authentication
├── shared/
│   └── schema.ts         # Database schema
└── templates/            # Design templates
```

## 🎨 Features

### Core Features
- ✅ Google & Email Authentication
- ✅ AI-Powered Design Generation
- ✅ Multi-AI Provider Support (GPT-4, Claude, Gemini)
- ✅ Real-time Design Preview
- ✅ Template Library System
- ✅ Credit-based Usage System
- ✅ Responsive Design Editor

### AI Capabilities
- **Text-to-Design**: Generate designs from prompts
- **Smart Templates**: AI-curated design templates
- **Background Generation**: Flux AI image generation
- **Content Optimization**: AI-powered copy suggestions
- **Style Transfer**: Apply design styles automatically

### Design Tools
- **Visual Editor**: Drag-and-drop interface
- **Template Browser**: 700+ professional templates
- **Asset Management**: Upload and manage media
- **Export Options**: PNG, PDF, SVG formats
- **Responsive Preview**: Multi-device compatibility

## 🔒 Authentication System

### Popup Authentication (Primary)
- Uses Firebase popup for seamless login
- Bypasses domain authorization issues
- Immediate authentication feedback

### Redirect Fallback
- Automatic fallback if popup blocked
- Handles domain authorization errors
- Clear error messaging with setup instructions

### User Management
- Automatic backend user creation
- 100 free credits for new users
- Session management and persistence

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user

### Design Generation
- `POST /api/generate/flyer` - Generate design with AI
- `POST /api/generate/background` - Generate background image
- `GET /api/templates` - Get design templates
- `POST /api/designs` - Save design

### Credits
- `GET /api/user/credits` - Get user credits
- `POST /api/user/credits/purchase` - Purchase credits

## 🚀 Development

### Start Development Server
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Database Operations
```bash
# Push schema changes
npm run db:push

# Generate migrations
npm run db:generate

# View database
npm run db:studio
```

### Build for Production
```bash
npm run build
```

## 🐛 Troubleshooting

### Firebase Authentication Issues
1. **Domain not authorized**: Add your domain to Firebase authorized domains
2. **Popup blocked**: Enable popups in browser settings
3. **Invalid configuration**: Check Firebase environment variables

### Database Connection Issues
1. Check `DATABASE_URL` format
2. Verify database exists and accessible
3. Run `npm run db:push` to sync schema

### AI Service Issues
1. Verify API keys are correct and active
2. Check API rate limits and quotas
3. Ensure services are enabled in provider dashboards

### Build Issues
1. Clear node_modules: `rm -rf node_modules && npm install`
2. Clear build cache: `npm run build --force`
3. Check TypeScript errors: `npm run type-check`

## 📱 Mobile Support

The application is fully responsive and supports:
- iOS Safari
- Android Chrome
- Progressive Web App features
- Touch-optimized interface

## 🔐 Security Features

- Environment variable validation
- API key encryption
- CORS configuration
- Session security
- Input sanitization
- XSS protection

## 📊 Performance

- Code splitting with Vite
- Lazy loading components
- Image optimization
- Caching strategies
- Bundle size optimization

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

This project is proprietary software. All rights reserved.

---

## Quick Deployment Checklist

- [ ] Environment variables configured
- [ ] Firebase project setup with domains
- [ ] Database connected and migrated
- [ ] AI service API keys added
- [ ] Authentication tested
- [ ] Build successful
- [ ] Production domains added to Firebase

For support, check the troubleshooting section or create an issue.