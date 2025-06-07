import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithRedirect, 
  signInWithPopup,
  GoogleAuthProvider, 
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('Firebase Config:', {
  hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
  hasAppId: !!import.meta.env.VITE_FIREBASE_APP_ID,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  currentDomain: window.location.hostname,
  currentOrigin: window.location.origin
});

// Initialize Firebase app or use existing one
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

const provider = new GoogleAuthProvider();

// Export all Firebase auth functions for use in components
export { 
  onAuthStateChanged, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
};

// Call this function when the user clicks on the "Login" button
export async function login() {
  try {
    console.log('Initiating Firebase Google sign-in...');
    
    // Check if Firebase is properly configured
    if (!import.meta.env.VITE_FIREBASE_API_KEY || !import.meta.env.VITE_FIREBASE_PROJECT_ID) {
      throw new Error('Firebase configuration missing. Please check environment variables.');
    }
    
    // Add additional provider options for better compatibility
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    // Log the exact domain for Firebase configuration
    console.log('Current domain for Firebase:', window.location.origin);
    console.log('Add this exact domain to Firebase authorized domains:', window.location.hostname);
    
    // Try popup first (works better with domain restrictions), fallback to redirect
    try {
      const result = await signInWithPopup(auth, provider);
      return result;
    } catch (popupError: any) {
      console.log('Popup failed, trying redirect:', popupError.code);
      if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
        await signInWithRedirect(auth, provider);
      } else {
        throw popupError;
      }
    }
  } catch (error) {
    console.error('Firebase login error:', error);
    throw error;
  }
}

// Call this function on page load when the user is redirected back to your site
export async function handleRedirect() {
  try {
    const result = await getRedirectResult(auth);
    return result;
  } catch (error) {
    console.error('Redirect handling error:', error);
    throw error;
  }
}