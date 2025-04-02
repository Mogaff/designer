// Import Firebase SDK
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Firebase configuration - fallback to hardcoded values if env vars not available (for deployment)
// Using a combination approach to ensure it works in both dev and production
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA84jOtKbd_aFr07gt4EKH_md_XVhX-RZw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dieseiner-7c81b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dieseiner-7c81b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dieseiner-7c81b.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1036981554541",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1036981554541:web:be9d2d84f7d7b83abc85b8"
};

console.log("Firebase config (API key redacted):", {
  ...firebaseConfig, 
  apiKey: firebaseConfig.apiKey ? "REDACTED" : "MISSING"
});

// Initialize Firebase with a unique name to avoid duplicate app initialization
const app = initializeApp(firebaseConfig, 'haitu-app');

// Initialize Firebase Authentication
const auth = getAuth(app);

// For deployment compatibility with Replit custom domains
const isRunningOnReplit = window.location.hostname.includes('replit');
if (isRunningOnReplit && window.location.hostname !== 'ai-flyer-genius-haitucreations.replit.app') {
  // If on a Replit development domain, configure auth to use the main authorized domain
  auth.useDeviceLanguage();
  // @ts-ignore - accessing internal config for compatibility
  auth.config.authDomain = 'ai-flyer-genius-haitucreations.replit.app';
}

// Create a Google Auth Provider with custom parameters
const googleProvider = new GoogleAuthProvider();
// Add scopes if needed
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
// Set custom parameters - this helps with domain authorization
googleProvider.setCustomParameters({
  prompt: 'select_account',
  login_hint: 'Use your Google account'
});

// Export auth services
export { 
  auth, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  googleProvider,
  signOut,
  onAuthStateChanged
};