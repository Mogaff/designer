import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  auth, 
  signInWithPopup,
  googleProvider,
  signOut,
  onAuthStateChanged
} from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

// Types for our auth context
type User = {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Watch auth state changes
  useEffect(() => {
    
    // Watch Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setIsLoading(false);
      if (fbUser) {
        // User is signed in
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL
        });
      } else {
        // User is signed out
        setUser(null);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [toast]);

  // Google sign-in function with popup
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      console.log('Starting Google sign-in with popup...');
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Popup login successful:', result.user.email);
      
      // Get the Firebase token to send to our backend
      const idToken = await result.user.getIdToken();
      
      // Check if user exists in our backend, and create if needed
      try {
        // First try to get user profile - this will create user if doesn't exist
        // because our authentication middleware handles that
        const response = await fetch('/api/auth/user', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        // If user doesn't exist, our middleware will create one
        if (response.ok) {
          const userData = await response.json();
          console.log('User data from backend:', userData);
        }
      } catch (backendError) {
        console.error('Error communicating with backend:', backendError);
        // We can continue even if this fails, as subsequent API calls
        // will also include the token and create user if needed
      }
      
      toast({
        title: 'Login successful',
        description: 'You are now logged in with Google.',
      });
    } catch (error: any) {
      let errorMessage = 'Google sign-in failed';
      console.error('Google sign-in error:', error);
      
      // Better error messages for common issues
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Login cancelled. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Login popup was blocked. Please enable popups for this site.';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'Authentication problem: This domain must be authorized in the Firebase console.';
        console.error('Domain not authorized:', window.location.origin, 'Please add to Firebase console');
      } else if (error.code) {
        errorMessage = `Authentication error: ${error.code}`;
      }
      
      toast({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      // Toast message removed to simplify the logout experience
    } catch (error: any) {
      toast({
        title: 'Logout Failed',
        description: error.message || 'There was an issue logging you out',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // DEVELOPMENT ONLY: Force authentication to true
  // This allows access without needing to login with Firebase
  const value = {
    user: user || { uid: 'dev-user', email: 'dev@example.com', displayName: 'Development User' },
    isLoading: false,
    isAuthenticated: true, // Always true in development mode
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};