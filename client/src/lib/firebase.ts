import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Export auth instance and functions
export { auth, googleProvider };

// Function to sign in with Google redirect
export const signInWithGoogle = () => {
  return signInWithRedirect(auth, googleProvider);
};

// Function to handle the redirect result
export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // Get the Google access token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      // Get the user info
      const user = result.user;
      
      // Return user data
      return {
        success: true,
        user,
        token
      };
    }
    return { success: false, message: "No redirect result" };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        email: error.customData?.email || null,
        credential: GoogleAuthProvider.credentialFromError(error)
      }
    };
  }
};

// Function to get current user's ID token
export const getCurrentUserIdToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error("Error getting user ID token:", error);
    return null;
  }
};