// Import Firebase SDK
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase with a unique name to avoid duplicate app initialization
const app = initializeApp(firebaseConfig, 'haitu-app');

// Initialize Firebase Authentication
const auth = getAuth(app);

// Create a Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Export auth services
export { 
  auth, 
  signInWithPopup,
  googleProvider,
  signOut,
  onAuthStateChanged
};