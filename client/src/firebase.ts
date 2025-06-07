import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
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

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA84jOtKbd_aFr07gt4EKH_md_XVhX-RZw",
  authDomain: "dieseiner-7c81b.firebaseapp.com",
  projectId: "dieseiner-7c81b",
  storageBucket: "dieseiner-7c81b.firebasestorage.app",
  messagingSenderId: "558539292154",
  appId: "1:558539292154:web:42d226ba62295008e2f843",
  measurementId: "G-2H2Z4GEFL9"
};

console.log('Firebase Config:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasProjectId: !!firebaseConfig.projectId,
  hasAppId: !!firebaseConfig.appId,
  authDomain: firebaseConfig.authDomain,
  currentDomain: window.location.hostname,
  currentOrigin: window.location.origin
});

// Initialize Firebase app or use existing one
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Analytics (only in production)
let analytics;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  analytics = getAnalytics(app);
}

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
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
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
    console.log('Firebase configured for domain:', firebaseConfig.authDomain);
    
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