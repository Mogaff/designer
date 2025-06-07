import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { storage } from './storage-simple';
import type { User } from '@shared/schema';
import { Request, Response, NextFunction } from 'express';

// Configure Passport.js Local Strategy
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      // Find the user by username
      const user = await storage.getUserByUsername(username);
      
      // If user doesn't exist
      if (!user) {
        return done(null, false, { message: 'Incorrect username' });
      }
      
      // Check if password is correct
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password' });
      }
      
      // If credentials are correct, return the user
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

// Serialize user to store in session
passport.serializeUser((user: Express.User, done) => {
  const userWithId = user as User;
  done(null, userWithId.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Authentication middleware - always enabled for production
const AUTH_ENABLED = true;

// Mock user for temporary authentication bypass
const MOCK_USER = {
  id: 2, // Using ID 2 since it appears to be a valid user ID in your system
  username: 'temp-user',
  email: 'temp@example.com',
  display_name: 'Temporary User'
};

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // If authentication is disabled, attach a mock user to the request
  if (!AUTH_ENABLED) {
    console.log('Server auth check bypassed - using mock user');
    // @ts-ignore: Attaching user to request
    req.user = MOCK_USER;
    return next();
  }
  
  // Normal authentication check
  if (req.isAuthenticated()) {
    return next();
  }
  
  // If not authenticated and auth is enabled, return 401 Unauthorized
  res.status(401).json({ message: 'Unauthorized' });
}

export default passport;