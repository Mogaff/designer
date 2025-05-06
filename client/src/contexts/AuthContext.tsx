import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  auth, 
  googleProvider,
  signInWithGoogle,
  handleRedirectResult,
  signInAnonymouslyWithFallback
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

  // We don't need to check for redirect results anymore since we're using popup
  // but we'll keep this for future reference if needed
  useEffect(() => {
    // Initialize auth state when the component mounts
    setIsLoading(false);
  }, []);

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

  // Google Sign-in with anonymous fallback
  const signInWithGoogleAuth = async () => {
    try {
      setIsLoading(true);
      console.log('Starting Google sign-in with popup...');
      
      // Use the imported signInWithGoogle function from our firebase.ts
      // This will open a popup for Google authentication
      const result = await signInWithGoogle();
      
      if (result.success && result.user) {
        // Show success notification
        toast({
          title: 'Login erfolgreich',
          description: 'Sie sind jetzt mit Google angemeldet.',
        });
        
        // Note: The auth state listener will handle the user state update
        return;
      } 
      
      // Handle authentication errors with Google
      if (result.error) {
        const errorCode = result.error.code;
        
        // For domain-related errors, fall back to anonymous auth
        if (errorCode === 'auth/unauthorized-domain') {
          console.log('Domain nicht autorisiert. Versuche anonyme Anmeldung als Fallback...');
          
          // Try anonymous sign-in as fallback
          const anonResult = await signInAnonymouslyWithFallback();
          
          if (anonResult.success) {
            toast({
              title: 'Als Gast angemeldet',
              description: 'Sie sind jetzt als Gast angemeldet. Einige Funktionen sind möglicherweise eingeschränkt.',
            });
            return;
          } else {
            // If anonymous auth also fails, show error
            toast({
              title: 'Anmeldung fehlgeschlagen',
              description: 'Sowohl Google-Anmeldung als auch Gast-Anmeldung fehlgeschlagen.',
              variant: 'destructive',
            });
          }
        } else {
          // For other errors, show appropriate message
          let errorMessage = 'Anmeldung mit Google fehlgeschlagen';
          
          if (errorCode === 'auth/popup-blocked') {
            errorMessage = 'Das Login-Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite.';
          } else if (errorCode === 'auth/popup-closed-by-user') {
            errorMessage = 'Der Login-Vorgang wurde abgebrochen.';
          } else if (errorCode) {
            errorMessage = `Authentifizierungsfehler: ${errorCode}`;
          }
          
          toast({
            title: 'Anmeldung fehlgeschlagen',
            description: errorMessage,
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Try anonymous sign-in as fallback for any error
      console.log('Versuche anonyme Anmeldung als Fallback nach Fehler...');
      
      try {
        const anonResult = await signInAnonymouslyWithFallback();
        
        if (anonResult.success) {
          toast({
            title: 'Als Gast angemeldet',
            description: 'Sie sind jetzt als Gast angemeldet. Einige Funktionen sind möglicherweise eingeschränkt.',
          });
          return;
        }
      } catch (anonError) {
        console.error('Anonymous sign-in fallback error:', anonError);
        toast({
          title: 'Anmeldung fehlgeschlagen',
          description: 'Keine Anmeldemethode verfügbar. Bitte versuchen Sie es später erneut.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
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