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

// Firebase configuration - use the updated configuration values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA84jOtKbd_aFr07gt4EKH_md_XVhX-RZw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dieseiner-7c81b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dieseiner-7c81b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dieseiner-7c81b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "558539292154",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:558539292154:web:5c6a993fd80165e4e2f843"
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
// Use the authorized domain from your Firebase console
// @ts-ignore - accessing internal config for compatibility
auth.config.authDomain = 'dieseiner-7c81b.firebaseapp.com';
auth.useDeviceLanguage();

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