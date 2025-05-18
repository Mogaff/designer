// Import Firebase SDK
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  Auth
} from 'firebase/auth';

// Firebase configuration with correct values
const firebaseConfig = {
  apiKey: "AIzaSyA84jOtKbd_aFr07gt4EKH_md_XVhX-RZw",
  authDomain: "dieseiner-7c81b.firebaseapp.com",
  projectId: "dieseiner-7c81b",
  storageBucket: "dieseiner-7c81b.firebasestorage.app",
  messagingSenderId: "558539292154",
  appId: "1:558539292154:web:5c6a993fd80165e4e2f843",
  measurementId: "G-N4LRJ0Z0B1"
};

console.log("Current domain:", window.location.origin);

// Initialize Firebase once
let firebaseApp;

// Check if Firebase is already initialized
if (getApps().length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}

// Define auth with proper type
const auth = getAuth(firebaseApp);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Login dialog settings
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Export Firebase services
export { 
  auth, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  googleProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
};