import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { storage } from './storage';
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

// Authentication middleware
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // TEMPORARY: For testing purposes only - until we fully integrate Firebase Auth
  // This allows all requests to pass through with a mock user
  // WARNING: Remove this in production when Firebase Auth integration is complete
  
  // Set a mock user for testing if not authenticated
  if (!req.isAuthenticated()) {
    const mockUserId = 1;
    // Make sure we have this mock user in our storage
    storage.getUser(mockUserId).then(async (user) => {
      if (!user) {
        // Create the mock user in storage if it doesn't exist
        try {
          await storage.createUser({
            username: 'test_user',
            email: 'test@example.com',
            password: 'not_real_password',
            firebase_uid: 'mock_firebase_uid'
          });
          console.log("Created mock user for testing");
        } catch (err) {
          console.error("Error checking for mock user:", err);
        }
      }
    }).catch(err => {
      console.error("Error checking for mock user:", err);
    });
    
    // Set the mock user on the request
    req.user = {
      id: mockUserId,
      username: 'test_user',
      email: 'test@example.com',
      password: 'not_real_password',
      firebase_uid: 'mock_firebase_uid'
    };
  }
  
  return next();
  
  // Original authentication logic (commented out for testing)
  // if (req.isAuthenticated()) {
  //   return next();
  // }
  // res.status(401).json({ message: 'Unauthorized' });
}

export default passport;