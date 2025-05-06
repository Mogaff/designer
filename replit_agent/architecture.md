# Architecture Overview

## 1. Overview

This application is a web-based platform that appears to provide AI-generated design services, with a credit-based system for users to access these services. The system is built using a modern stack with a clear separation between frontend and backend components.

The application follows a client-server architecture with:
- A React frontend built with Vite
- A Node.js Express backend
- PostgreSQL database accessed through Drizzle ORM
- Firebase for authentication

## 2. System Architecture

### 2.1 High-Level Architecture

The system follows a typical three-tier architecture:

1. **Presentation Layer**: React-based frontend with Tailwind CSS for styling
2. **Application Layer**: Node.js/Express backend providing API endpoints and business logic
3. **Data Layer**: PostgreSQL database with Drizzle ORM for data access

```
┌────────────────┐      ┌────────────────┐      ┌────────────────┐
│                │      │                │      │                │
│  React Frontend│<─────│  Node.js/Express│<─────│  PostgreSQL DB │
│  (Vite)        │      │  Backend       │      │  (Drizzle ORM) │
│                │      │                │      │                │
└────────────────┘      └────────────────┘      └────────────────┘
        ▲                       ▲                       ▲
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌────────────────┐      ┌────────────────┐      ┌────────────────┐
│                │      │                │      │                │
│  UI Components │      │  External APIs │      │  Firebase Auth │
│  (Radix UI)    │      │  (AI Services) │      │                │
│                │      │                │      │                │
└────────────────┘      └────────────────┘      └────────────────┘
```

### 2.2 Communication Flow

- The frontend communicates with the backend via HTTP/REST APIs
- The backend interacts with the database using Drizzle ORM
- Authentication is handled via Firebase
- External services are integrated for AI-generated content

## 3. Key Components

### 3.1 Frontend

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Components**: Extensive use of Radix UI components
- **Styling**: Tailwind CSS with custom configurations
- **State Management**: Appears to use React Query based on dependencies

### 3.2 Backend

- **Framework**: Node.js with Express
- **Language**: TypeScript
- **API Layer**: RESTful API endpoints
- **Authentication**: Firebase and Passport.js integration
- **Processing**: Handles business logic, database operations, and integration with AI services

### 3.3 Database

- **Engine**: PostgreSQL
- **ORM**: Drizzle ORM
- **Schema Management**: Migration scripts for table creation and updates
- **Main Entities**:
  - Users (authentication, profile data, credits)
  - User Credits (transaction history)
  - Design Configs (user design preferences)

### 3.4 Authentication & Authorization

- **Primary Auth**: Firebase Authentication
- **Session Management**: Express session
- **User Data**: User information stored in PostgreSQL with Firebase UIDs

### 3.5 External Integrations

- **AI Services**:
  - Google's Generative AI (Gemini)
  - Anthropic AI
  - Fal AI
- **Media Processing**: FFmpeg for video manipulation

## 4. Data Flow

### 4.1 User Authentication Flow

1. User authenticates via Firebase
2. Backend verifies Firebase token
3. User session is created with passport.js
4. User data is retrieved from or created in the database

### 4.2 Credit System Flow

1. Users have a credit balance stored in the database
2. Actions like creating designs consume credits
3. Credit transactions are recorded in the user_credits table
4. Premium users may have different credit behaviors

### 4.3 Design Generation Flow

1. User configures design parameters
2. System checks if user has sufficient credits
3. Credits are deducted from user balance
4. AI services are called to generate designs
5. Results are returned to the user and potentially stored

## 5. External Dependencies

### 5.1 Core Dependencies

- React and related libraries
- Express.js for backend
- Drizzle ORM for database access
- Firebase for authentication
- Tailwind CSS for styling
- Radix UI for component library

### 5.2 AI Services

- **@anthropic-ai/sdk**: Integration with Anthropic's AI models
- **@fal-ai/client**: Integration with Fal AI services
- **@google/generative-ai**: Integration with Google's Gemini AI

### 5.3 Media Processing

- FFmpeg: Used for video processing and manipulation

## 6. Deployment Strategy

### 6.1 Environment

- The application is configured to run on Replit
- The vite.config.ts has special handling for Replit deployment

### 6.2 Build Process

- Frontend: Built using Vite
- Backend: Bundled using esbuild
- Combined builds are placed in a dist directory

### 6.3 Runtime Configuration

- Environment variables managed through .env files
- Database connection is configured via DATABASE_URL environment variable
- Firebase configuration is set via environment variables

### 6.4 Infrastructure

- Application appears to be designed for cloud deployment
- PostgreSQL database as the persistent storage layer
- Replit-specific configurations for easy deployment
- Possible autoscaling configuration based on deployment settings