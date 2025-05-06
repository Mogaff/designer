import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInAnonymously } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // Use standard Firebase domain instead of Replit domain to avoid auth issues
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase only once - prevent duplicate app initialization during HMR
let app;
try {
  // Check if Firebase is already initialized
  if (getApps().length === 0) {
    console.log("Initializing Firebase app for the first time");
    app = initializeApp(firebaseConfig);
  } else {
    console.log("Firebase already initialized, reusing existing app");
    app = getApp();
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// Get auth instance
const auth = getAuth(app);

// Configure Google Provider with custom settings
const googleProvider = new GoogleAuthProvider();

// Add scopes for the Google provider
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Set custom parameters for the auth provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Export auth instance and functions
export { auth, googleProvider };

// Function to sign in with Google using popup (more reliable than redirect for Replit)
export const signInWithGoogle = async () => {
  try {
    console.log("Starting Google sign-in with popup...");
    const result = await signInWithPopup(auth, googleProvider);
    
    // Get the Google access token
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    
    // Get the user info
    const user = result.user;
    
    // Log success data
    console.log("Auth successful for user:", user.email);
    console.log("User ID:", user.uid);
    
    // Get ID token for backend authentication
    const idToken = await user.getIdToken();
    console.log("ID token available:", !!idToken);
    
    // Return user data
    return {
      success: true,
      user,
      token,
      idToken
    };
  } catch (error: any) {
    console.error("Firebase popup sign-in error:", error);
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        email: error.customData?.email || null,
        credential: GoogleAuthProvider.credentialFromError(error)
      }
    };
  }
};

// Legacy function to handle redirect result
// Not used anymore but kept for compatibility
export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    console.log("Firebase redirect result:", result ? "Success" : "No result");
    
    if (result) {
      // Get the Google access token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      // Get the user info
      const user = result.user;
      
      // Log success data
      console.log("Auth successful for user:", user.email);
      console.log("User ID:", user.uid);
      
      // Get ID token for backend authentication
      const idToken = await user.getIdToken();
      console.log("ID token available:", !!idToken);
      
      // Return user data
      return {
        success: true,
        user,
        token,
        idToken
      };
    }
    return { success: false, message: "No redirect result" };
  } catch (error: any) {
    console.error("Firebase redirect error:", error);
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        email: error.customData?.email || null,
        credential: GoogleAuthProvider.credentialFromError(error)
      }
    };
  }
};

// Function to get current user's ID token
export const getCurrentUserIdToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error("Error getting user ID token:", error);
    return null;
  }
};

// Sign in anonymously - this doesn't require domain validation
export const signInAnonymouslyWithFallback = async () => {
  try {
    console.log("Starting anonymous sign-in...");
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    
    console.log("Anonymous auth successful, user ID:", user.uid);
    
    // Get ID token for backend authentication
    const idToken = await user.getIdToken();
    console.log("Anonymous ID token available:", !!idToken);
    
    return {
      success: true,
      user,
      idToken,
      anonymous: true
    };
  } catch (error: any) {
    console.error("Anonymous sign-in error:", error);
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    };
  }
};