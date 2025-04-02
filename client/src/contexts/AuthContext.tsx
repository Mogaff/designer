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
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Redirect result:', result.user);
          // User successfully signed in via redirect
          toast({
            title: 'Login Successful',
            description: 'Welcome! You are now signed in with Google.',
          });
        }
      } catch (error: any) {
        console.error('Redirect result error:', error);
        
        // Handle errors from redirect result
        if (error.code === 'auth/unauthorized-domain') {
          toast({
            title: 'Login Failed',
            description: 'This domain is not authorized for sign-in. Please contact support.',
            variant: 'destructive',
          });
          console.error('Domain not authorized. Make sure to add this domain to Firebase console auth settings.');
        }
      }
    };
    
    checkRedirectResult();
    
    // Watch for Firebase auth state changes
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

  // Google Sign-in function
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      console.log('Starting Google sign-in process using popup...');
      
      // Check if we're on the production domain
      const isProductionDomain = window.location.hostname === 'ai-flyer-genius-haitucreations.replit.app';
      
      // For the production domain, use popup for better UX
      if (isProductionDomain) {
        try {
          console.log('Using popup for production domain');
          await signInWithPopup(auth, googleProvider);
        } catch (error: any) {
          console.error('Production popup failed:', error);
          // If popup fails on production domain, use redirect
          if (error.code === 'auth/popup-closed-by-user') {
            throw error; // Don't auto-retry if user closed popup
          } else {
            console.log('Falling back to redirect method for production');
            await signInWithRedirect(auth, googleProvider);
          }
        }
      } else {
        // For any other domain (dev/preview), use redirect
        console.log('Using redirect for non-production domain');
        await signInWithRedirect(auth, googleProvider);
      }
    } catch (error: any) {
      let errorMessage = 'Failed to sign in with Google';
      console.error('Google sign-in error:', error);
      
      // Firebase auth error handling with better error messages
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in cancelled. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Sign-in popup was blocked. Please enable popups for this site.';
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for sign-in. Please visit ai-flyer-genius-haitucreations.replit.app';
        console.error('Domain not authorized. Add domain to Firebase console auth settings: ' + window.location.origin);
      } else if (error.code) {
        errorMessage = `Authentication error: ${error.code}`;
      }
      
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw error;
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