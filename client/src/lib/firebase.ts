// Import Firebase SDK
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Log the current domain that needs to be added to Firebase
console.log("Current domain that needs to be authorized in Firebase:", window.location.origin);

console.log("Initializing Firebase with environment variables");

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

// Export Firebase services
export { 
  auth, 
  signInWithPopup,
  googleProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
};