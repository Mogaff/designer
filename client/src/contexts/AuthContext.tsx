import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  auth, 
  googleProvider,
  signInWithGoogle,
  handleRedirectResult 
} from '@/lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
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

  // Function to sync Firebase user with our backend
  const syncUserWithBackend = async (fbUser: FirebaseUser) => {
    try {
      // Import the api client
      const { api } = await import('../lib/api');
      
      // Get the user's Firebase ID token for authentication
      const idToken = await fbUser.getIdToken();
      console.log("Syncing user with backend. ID token available:", !!idToken);
      
      // Send Firebase user data to our backend using the API client
      // The API client will automatically include the ID token in Authorization header
      try {
        const userData = await api.post('/api/auth/firebase', {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
        });
        
        console.log('User synced with backend successfully');
        console.log('User data from backend:', userData);
      } catch (apiError) {
        console.error('Failed to sync user with backend:', apiError);
      }
    } catch (error) {
      console.error('Error syncing user with backend:', error);
    }
  };

  // Handle redirect result when the user returns from Google authentication
  useEffect(() => {
    const checkRedirectResult = async () => {
      setIsLoading(true);
      try {
        // Check if we're returning from a redirect operation
        const result = await handleRedirectResult();
        
        if (result.success && result.user) {
          // User successfully logged in via redirect
          console.log('Redirect login successful:', result.user.email);
          
          // No need to set user state here as the auth state change listener will handle it
          
          toast({
            title: 'Login erfolgreich',
            description: 'Sie sind jetzt mit Google angemeldet.',
          });
        } else if (result.error) {
          console.error('Redirect login error:', result.error);
          
          let errorMessage = 'Anmeldung mit Google fehlgeschlagen';
          const errorCode = result.error.code;
          
          if (errorCode === 'auth/unauthorized-domain') {
            errorMessage = 'Authentifizierungsproblem: Diese Domain muss in der Firebase-Konsole autorisiert werden.';
            console.error('Domain nicht autorisiert:', window.location.origin, 'Bitte in Firebase-Konsole hinzufügen');
          } else if (errorCode) {
            errorMessage = `Authentifizierungsfehler: ${errorCode}`;
          }
          
          toast({
            title: 'Anmeldung fehlgeschlagen',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error checking redirect result:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Check for redirect result when the component mounts
    checkRedirectResult();
  }, [toast]);

  // Watch auth state changes
  useEffect(() => {
    
    // Watch Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      
      if (fbUser) {
        // User is signed in with Firebase
        try {
          // Sync with our backend (this creates/updates the user in our database)
          await syncUserWithBackend(fbUser);
          
          // Set user in state
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL
          });
        } catch (error) {
          console.error('Error processing authenticated user:', error);
          // Even if backend sync fails, we still consider the user logged in with Firebase
          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL
          });
        }
      } else {
        // User is signed out
        setUser(null);
        
        // Also logout from backend
        try {
          const { api } = await import('../lib/api');
          await api.post('/api/auth/logout', {}, { includeAuth: false });
          console.log('Successfully logged out from backend');
        } catch (error) {
          console.error('Error logging out from backend:', error);
        }
      }
      
      setIsLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [toast]);

  // Google Sign-in with Redirect (new implementation)
  const signInWithGoogleAuth = async () => {
    try {
      setIsLoading(true);
      console.log('Starting Google sign-in with redirect...');
      
      // Use the imported signInWithGoogle function from our firebase.ts
      // This will redirect the user to Google's login page
      await signInWithGoogle();
      
      // No toast here as the page will redirect to Google
      // We'll handle the redirect result in the useEffect below
    } catch (error: any) {
      let errorMessage = 'Anmeldung mit Google fehlgeschlagen';
      console.error('Google sign-in error:', error);
      
      // Error handling for redirect
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'Authentifizierungsproblem: Diese Domain muss in der Firebase-Konsole autorisiert werden.';
        console.error('Domain nicht autorisiert:', window.location.origin, 'Bitte in Firebase-Konsole hinzufügen');
      } else if (error.code) {
        errorMessage = `Authentifizierungsfehler: ${error.code}`;
      }
      
      toast({
        title: 'Anmeldung fehlgeschlagen',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsLoading(false);
    }
    // Don't set isLoading to false here as the page will redirect
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      
      // First logout from Firebase (client-side)
      await signOut(auth);
      
      // Note: The authState listener will handle server-side logout
      console.log('Firebase logout successful');
      
    } catch (error: any) {
      console.error('Logout error:', error);
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
    signInWithGoogle: signInWithGoogleAuth,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};