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

  // Google Sign-in function
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      
      console.log('Starting Google sign-in...');
      console.log('Current origin:', window.location.origin);
      
      // Überprüfen, auf welcher Domain wir sind
      const currentDomain = window.location.hostname;
      const isProduction = currentDomain === 'designer.haitucreations.ai';
      
      console.log('Current domain:', currentDomain);
      console.log('Is production environment:', isProduction);
      
      // In Produktion verwenden wir Popup zuerst (weniger Probleme mit Redirects)
      if (isProduction) {
        try {
          console.log('Production environment - trying popup sign-in first');
          const result = await signInWithPopup(auth, googleProvider);
          console.log('Popup login successful:', result.user.email);
          toast({
            title: 'Login erfolgreich',
            description: 'Sie sind jetzt mit Google angemeldet.',
          });
          return;
        } catch (popupError: any) {
          console.error('Popup sign-in error in production:', popupError);
          
          if (popupError.code === 'auth/popup-blocked' || 
              popupError.code === 'auth/popup-closed-by-user') {
            console.log('Popup blocked - falling back to redirect...');
            
            // Bei blockierten Popups verwenden wir Redirect als Fallback
            await signInWithRedirect(auth, googleProvider);
            return;
          }
          
          // Bei anderen Fehlern werfen wir den Fehler weiter
          throw popupError;
        }
      } else {
        // In Entwicklungsumgebung oder anderen Domains
        console.log('Development environment - using redirect sign-in');
        // Wir verwenden direkt Redirect auf Nicht-Produktionsumgebungen
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      
    } catch (error: any) {
      let errorMessage = 'Anmeldung mit Google fehlgeschlagen';
      console.error('Google sign-in error:', error);
      
      // Bessere Fehlermeldungen
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Anmeldung abgebrochen. Bitte versuchen Sie es erneut.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Anmelde-Popup wurde blockiert. Bitte aktivieren Sie Popups für diese Seite.';
      } else if (error.code === 'auth/unauthorized-domain') {
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

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};