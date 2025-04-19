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

  // Check for redirect result on component mount
  useEffect(() => {
    async function checkRedirectResult() {
      try {
        setIsLoading(true);
        // Get redirect result
        const result = await getRedirectResult(auth);
        
        // If we have a result, the user has been redirected back from Google
        if (result && result.user) {
          console.log('Redirect login successful:', result.user.email);
          
          // Get the Firebase token to send to our backend
          const idToken = await result.user.getIdToken();
          
          // Check if user exists in our backend, and create if needed
          try {
            const response = await fetch('/api/auth/user', {
              headers: {
                'Authorization': `Bearer ${idToken}`
              }
            });
            
            if (response.ok) {
              const userData = await response.json();
              console.log('User data from backend:', userData);
              
              toast({
                title: 'Login successful',
                description: 'You are now logged in with Google.',
              });
            }
          } catch (backendError) {
            console.error('Error communicating with backend:', backendError);
          }
        }
      } catch (error: any) {
        if (error.code) {
          let errorMessage = 'Authentication error';
          console.error('Google sign-in redirect error:', error);
          
          if (error.code === 'auth/unauthorized-domain') {
            errorMessage = 'Authentication problem: This domain must be authorized in the Firebase console.';
            console.error('Domain not authorized:', window.location.origin, 'Please add to Firebase console');
          } else {
            errorMessage = `Authentication error: ${error.code}`;
          }
          
          toast({
            title: 'Login failed',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    checkRedirectResult();
  }, [toast]);

  // Google sign-in function with redirect
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      console.log('Starting Google sign-in with redirect...');
      
      // Use redirect-based auth instead of popup
      await signInWithRedirect(auth, googleProvider);
      // The page will redirect to Google and then back to our app
      // The redirect result will be processed in the useEffect above
      
    } catch (error: any) {
      let errorMessage = 'Google sign-in failed';
      console.error('Google sign-in error:', error);
      
      // Error handling for redirect method
      if (error.code === 'auth/unauthorized-domain') {
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

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};