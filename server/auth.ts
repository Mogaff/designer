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
  // Check if user is authenticated with session
  if (req.isAuthenticated() && req.user) {
    // User is authenticated via session
    return next();
  }
  
  // If not authenticated via session, check for Firebase token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const firebaseUid = authHeader.split('Bearer ')[1];
    
    // Get user by Firebase UID
    storage.getUserByFirebaseUid(firebaseUid)
      .then(async (user) => {
        if (user) {
          // User exists in our database, set them as the authenticated user
          req.user = user;
          return next();
        } else {
          // User doesn't exist yet, but has a valid Firebase token
          // Auto-create user with Firebase info
          try {
            const username = `user_${Date.now()}`; // Generate a unique username
            const randomPassword = Math.random().toString(36).slice(-10);
            const hashedPassword = await hashPassword(randomPassword);
            
            // Create new user with Firebase UID
            const newUser = await storage.createUser({
              username,
              password: hashedPassword,
              firebase_uid: firebaseUid,
              email: null, // These could be provided if sent from client
              display_name: null
            });
            
            console.log(`Created new user for Firebase UID: ${firebaseUid}`);
            
            // Set the new user as authenticated
            req.user = newUser;
            return next();
          } catch (err) {
            console.error("Error creating user from Firebase auth:", err);
            return res.status(500).json({ message: "Failed to create user account" });
          }
        }
      })
      .catch(err => {
        console.error("Error checking Firebase user:", err);
        return res.status(401).json({ message: "Unauthorized: Invalid Firebase token" });
      });
  } else {
    // No authentication method provided
    return res.status(401).json({ message: "Unauthorized: No valid authentication" });
  }
}

export default passport;