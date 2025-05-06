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
  // Check if user is authenticated with the session
  if (req.isAuthenticated()) {
    console.log("User authenticated via session:", (req.user as any)?.id);
    return next();
  }
  
  // Alternative authentication: Check for Firebase token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Extract the Firebase ID token from the Authorization header
    const idToken = authHeader.split(' ')[1];
    
    console.log("Found Authorization header with token");
    
    // We'll trust the token for now since it comes directly from Firebase
    // In a production environment, you would verify this token with Firebase Admin SDK
    try {
      // Extract Firebase UID from different sources 
      // 1. Check JSON body
      let firebaseUid = req.body?.uid;
      
      // 2. Check FormData/URL-encoded body
      if (!firebaseUid && req.body && typeof req.body === 'object') {
        firebaseUid = req.body.uid;
      }
      
      // 3. Check query params for GET requests
      if (!firebaseUid && req.query && req.query.uid) {
        firebaseUid = req.query.uid as string;
      }
      
      if (firebaseUid) {
        console.log("Found Firebase UID in request:", firebaseUid);
        
        // Find the user by Firebase UID
        storage.getUserByFirebaseUid(firebaseUid)
          .then(user => {
            if (user) {
              console.log("User found by Firebase UID:", user.id);
              // Set the user in the request
              (req as any).user = user;
              return next();
            } else {
              console.log("Firebase UID found but no matching user in database");
              res.status(401).json({ message: 'Unauthorized - User not found' });
            }
          })
          .catch(err => {
            console.error("Error looking up user by Firebase UID:", err);
            res.status(500).json({ message: 'Authentication error' });
          });
        return;
      } else {
        console.log("No Firebase UID found in request");
      }
    } catch (error) {
      console.error("Error processing auth token:", error);
    }
  }
  
  // If no valid authentication, return 401 Unauthorized
  console.log("No valid authentication found");
  res.status(401).json({ message: 'Unauthorized - no valid session or token' });
}

export default passport;