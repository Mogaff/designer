#!/bin/bash

# AI Design Platform - Development Startup Script
# This script sets up all environment variables and starts the development server

echo "🚀 Starting AI Design Platform in Development Mode..."

# Note: You'll need to get a valid Neon database URL from your dashboard
# Visit: https://console.neon.tech/app/projects and copy your connection string
export DATABASE_URL="postgresql://ai-design-platform_owner:NEW_PASSWORD@ep-small-unit-a1mgykwu.ap-southeast-1.aws.neon.tech/ai-design-platform?sslmode=require"

# Firebase Configuration (Client-side - with VITE_ prefix)
export VITE_FIREBASE_API_KEY="AIzaSyA84jOtKbd_aFr07gt4EKH_md_XVhX-RZw"
export VITE_FIREBASE_AUTH_DOMAIN="dieseiner-7c81b.firebaseapp.com"
export VITE_FIREBASE_PROJECT_ID="dieseiner-7c81b"
export VITE_FIREBASE_STORAGE_BUCKET="dieseiner-7c81b.firebasestorage.app"
export VITE_FIREBASE_MESSAGING_SENDER_ID="558539292154"
export VITE_FIREBASE_APP_ID="1:558539292154:web:42d226ba62295008e2f843"
export VITE_FIREBASE_MEASUREMENT_ID="G-2H2Z4GEFL9"

# AI API Keys
export OPENAI_API_KEY="sk-proj-xhBcMdJ4ViKcMUfE8zKJyVJWX3Qf0nBP2l7lf-NLlL8oQGr6cEDEjpQOyMSBWQCO2EYKqA_5KG_7e8d-0Dh1MtQ"
# Disable Gemini temporarily to prevent API errors
# export GEMINI_API_KEY="AIzaSyBi5qA9Q6_0r-85vZ7AZ2Vl15S50YKwlv0"
export ELEVENLABS_API_KEY=""
export CLAUDE_API_KEY=""
export ANTHROPIC_API_KEY="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"
export KLING_API_KEY=""
export FAL_KEY=""

# Payment Processing
export STRIPE_SECRET_KEY="sk_test_51QI5SDP1t0dD9iVQYEYGG7Hm8GCR6VWF23hjvInZIFtlWn6N9YTQmBLFJIeK6b8GUeMD7LwVOBIGvELu32BdH4KOI00JjZWKSTK"
export SESSION_SECRET="your-session-secret-here"

# Development Configuration
export NODE_ENV="development"
export PORT="5001"

echo "✅ Environment variables configured"
echo "🔧 Development mode enabled - database errors will be handled gracefully"
echo "📱 Templates, Credits, and Brand Kits APIs will work without authentication"
echo "⚠️  Gemini API disabled temporarily to prevent errors"
echo "🌐 Starting server on http://localhost:5001"
echo ""

# Start the development server
npm run dev 