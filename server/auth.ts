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

// Authentication middleware with multiple test users
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // TEMPORARY: For testing purposes only!
  // This allows all requests to pass through without authentication
  // WARNING: Remove this in production
  
  // Check if we have a user ID in the headers for testing different users
  const testUserId = req.headers['x-test-user-id'] ? parseInt(req.headers['x-test-user-id'] as string) : 1;
  
  // If not authenticated yet, apply test user
  if (!req.isAuthenticated()) {
    // Make sure we have this test user in our storage
    storage.getUser(testUserId).then(async (user) => {
      if (!user) {
        // Create the test user in storage if it doesn't exist
        try {
          const username = `test_user_${testUserId}`;
          const testPassword = 'not_real_password';
          const hashedPassword = await hashPassword(testPassword);
          
          await storage.createUser({
            username: username,
            email: `test${testUserId}@example.com`,
            password: hashedPassword,
            firebase_uid: `mock_firebase_uid_${testUserId}`
          });
          console.log(`Created test user ${testUserId} for testing`);
        } catch (err) {
          console.error(`Error creating test user ${testUserId}:`, err);
        }
      }
    }).catch(err => {
      console.error(`Error checking for test user ${testUserId}:`, err);
    });
    
    // Set the test user on the request
    req.user = {
      id: testUserId,
      username: `test_user_${testUserId}`,
      email: `test${testUserId}@example.com`,
      password: 'not_real_password',
      firebase_uid: `mock_firebase_uid_${testUserId}`
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