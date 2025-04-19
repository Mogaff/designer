// Import Firebase SDK
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: '', // Not required for auth
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log("Initializing Firebase with standard configuration");

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Standard Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Simple settings for login dialog
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Check if we're in development mode (on Replit)
const isDevelopment = window.location.hostname.includes('replit.dev');

// Function to sign in with development account (anonymous auth)
const signInWithDevelopmentAccount = async () => {
  try {
    // Use anonymous sign-in for development environments
    const result = await signInAnonymously(auth);
    console.log('Development login successful');
    return result;
  } catch (error) {
    console.error('Development login error:', error);
    throw error;
  }
};

// Export essential services - now including redirect methods and development mode
export { 
  auth, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  googleProvider,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInAnonymously,
  signInWithDevelopmentAccount,
  isDevelopment
};