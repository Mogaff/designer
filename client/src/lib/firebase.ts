// Import Firebase SDK
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "", // not needed for basic auth
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log("Initializing Firebase with configuration from environment variables:", {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? `${import.meta.env.VITE_FIREBASE_API_KEY.substring(0, 5)}...` : 'missing',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'missing',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ? 'present' : 'missing'
});

// Einfache Firebase-Initialisierung ohne irgendwelche komplexen Anpassungen
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Standard Google Auth Provider ohne zusätzliche Parameter
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Einfache Einstellungen für den Login-Dialog
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Nur die wesentlichen Dienste exportieren - wir verwenden keine Redirects mehr
export { 
  auth, 
  signInWithPopup,
  googleProvider,
  signOut,
  onAuthStateChanged
};