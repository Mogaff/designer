import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  auth, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

  // Check for redirect result and watch auth state changes
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        // Check if returning from a redirect
        console.log('Checking redirect result...');
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Redirect result successful:', result.user.email);
          // User successfully signed in via redirect
          toast({
            title: 'Login Successful',
            description: 'Welcome! You are now signed in with Google.',
          });
        } else {
          console.log('No redirect result found');
        }
      } catch (error: any) {
        console.error('Redirect result error:', error);
        
        // Handle errors from redirect result
        if (error.code === 'auth/unauthorized-domain') {
          console.error('Domain not authorized:', window.location.origin);
          toast({
            title: 'Authentication Error',
            description: 'Please make sure this domain is added to your Firebase console.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Login Error',
            description: error.message || 'There was an issue with the login process',
            variant: 'destructive',
          });
        }
      }
    };
    
    checkRedirectResult();
    
    // Check for temporary development user in localStorage
    const checkForTempUser = () => {
      try {
        const tempUserStr = localStorage.getItem('tempDevUser');
        if (tempUserStr) {
          const tempUser = JSON.parse(tempUserStr);
          console.log('Found temporary development user:', tempUser.email);
          setUser(tempUser);
          setIsLoading(false);
          return true;
        }
      } catch (error) {
        console.error('Error parsing temporary user:', error);
      }
      return false;
    };
    
    // First check for temporary dev user
    const hasTempUser = checkForTempUser();
    
    // If no temporary user, watch Firebase auth state
    let unsubscribe = () => {};
    if (!hasTempUser) {
      unsubscribe = onAuthStateChanged(auth, (fbUser) => {
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
    }

    // Cleanup subscription
    return () => unsubscribe();
  }, [toast]);

  // Google Sign-in function
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      
      // For Replit, we need to use redirect method as it's more reliable
      // with domain authorization
      console.log('Starting Google sign-in with redirect...');
      await signInWithRedirect(auth, googleProvider);
      
    } catch (error: any) {
      let errorMessage = 'Failed to sign in with Google';
      console.error('Google sign-in error:', error);
      
      // Firebase auth error handling with better error messages
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in cancelled. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Sign-in popup was blocked. Please enable popups for this site.';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'Authentication domain issue. Please try again or contact support.';
        console.error('Domain not authorized. Current origin: ' + window.location.origin);
      } else if (error.code) {
        errorMessage = `Authentication error: ${error.code}`;
      }
      
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Don't throw error on unauthorized domain as we're handling it with redirect
      if (error.code !== 'auth/unauthorized-domain') {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // First check if we have a temporary user
      if (localStorage.getItem('tempDevUser')) {
        // Remove temp user from localStorage
        localStorage.removeItem('tempDevUser');
        setUser(null);
        setIsLoading(false);
        return;
      }
      
      // If not using temp user, sign out from Firebase
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

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};