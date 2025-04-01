// Import Firebase SDK
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA84jOtKbd_aFr07gt4EKH_md_XVhX-RZw",
  authDomain: "dieseiner-7c81b.firebaseapp.com",
  projectId: "dieseiner-7c81b",
  storageBucket: "dieseiner-7c81b.appspot.com",
  messagingSenderId: "1036981554541",
  appId: "1:1036981554541:web:be9d2d84f7d7b83abc85b8"
};

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Initialize Firebase Authentication
const auth = getAuth(app);

// Export auth services
export { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};