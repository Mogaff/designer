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

  // Einfache Google Sign-in Funktion mit Popup
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      console.log('Starting Google sign-in with popup...');
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Popup login successful:', result.user.email);
      
      toast({
        title: 'Login erfolgreich',
        description: 'Sie sind jetzt mit Google angemeldet.',
      });
    } catch (error: any) {
      let errorMessage = 'Anmeldung mit Google fehlgeschlagen';
      console.error('Google sign-in error:', error);
      
      // Bessere Fehlermeldungen für häufige Fehler
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