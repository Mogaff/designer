# 🎨 AI Design Platform

An advanced AI-driven design platform that leverages cutting-edge artificial intelligence to transform creative content generation for marketing professionals.

## 🚀 Live Demo

- **Production:** [Coming Soon - Deploying on Vercel]
- **Local Development:** http://localhost:5000

## ✨ Features

### 🤖 AI-Powered Design Generation
- **OpenAI GPT-4** for intelligent content creation
- **Google Gemini** for advanced AI capabilities  
- **Multi-AI Provider Support** for optimal results

### 🎨 Design Tools
- **700+ Professional Templates** across multiple categories
- **Real-time Design Editor** with drag-and-drop interface
- **Smart Template Browser** with AI-curated suggestions
- **Multi-format Export** (PNG, PDF, SVG)

### 🔐 Authentication & User Management
- **Firebase Authentication** (Google + Email/Password)
- **User Profiles** with personalized settings
- **Credit-based Usage System** for fair access

### 💳 Business Features
- **Stripe Payment Integration** for credit purchases
- **Brand Kit Management** for consistent branding
- **Social Media Scheduling** (Instagram, LinkedIn)
- **Competitor Ad Analysis** tools

### 📱 Platform Support
- **Fully Responsive** design for all devices
- **Progressive Web App** features
- **Real-time Collaboration** capabilities

## 🛠 Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, DaisyUI
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Firebase Auth
- **AI Services:** OpenAI GPT-4, Claude 3.5, Google Gemini
- **Payments:** Stripe
- **Deployment:** Vercel
- **Database Hosting:** Neon (Serverless PostgreSQL)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (or Neon account)
- Firebase project
- API keys for AI services

### Installation

```bash
# Clone the repository
git clone https://github.com/Mogaff/designer.git
cd designer

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your API keys (see Environment Variables section)

# Initialize database
npm run db:push

# Start development server
npm run dev
```

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@host:5432/database

# Firebase Authentication
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app

# AI Services
OPENAI_API_KEY=sk-your_openai_key
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=sk-ant-your_claude_key

# Payments
STRIPE_SECRET_KEY=sk_your_stripe_key
STRIPE_PRICE_ID_PRO=price_id_for_pro_plan
STRIPE_PRICE_ID_STARTER=price_id_for_starter_plan

# Session
SESSION_SECRET=your_random_session_secret
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/firebase` - Firebase user authentication
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user

### Design Generation
- `POST /api/generate/flyer` - Generate AI-powered designs
- `GET /api/templates` - Get design templates
- `GET /api/templates/categories` - Get template categories
- `POST /api/templates/{id}/generate` - Generate from template

### User Management
- `GET /api/credits` - Get user credits
- `POST /api/user/credits/purchase` - Purchase credits
- `GET /api/creations` - Get user's designs
- `GET /api/brand-kits` - Get user's brand kits

## 🎯 Core Features

### AI Design Generation
Transform simple text prompts into professional designs using multiple AI providers for optimal results.

### Template Library
Browse and customize from 700+ professionally designed templates across multiple categories including:
- Business Flyers
- Social Media Posts  
- Event Posters
- Landing Pages
- Business Cards
- And more...

### Brand Kit Management
Create and manage consistent brand identities with:
- Color palettes
- Logo management
- Font selections
- Brand voice guidelines

### Credit System
Fair usage system with:
- Free credits for new users
- Flexible credit packages
- Transparent pricing
- Usage tracking

## 📱 Mobile Support

The platform is fully responsive and optimized for:
- Desktop browsers
- Tablet interfaces
- Mobile devices
- Progressive Web App installation

## 🔐 Security Features

- Environment variable validation
- API key encryption
- CORS configuration
- Session security
- Input sanitization
- XSS protection

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect GitHub Repository**
2. **Configure Environment Variables** in Vercel dashboard
3. **Deploy** - Automatic deployments on push to main

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Check the troubleshooting guide in `/docs`
- Review the API documentation

---

**Built with ❤️ by [Mo Gaff](https://github.com/Mogaff)**

*Transforming creative workflows with AI-powered design tools.*
