import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  auth, 
  signInWithPopup,
  googleProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
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
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
};

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  registerWithEmail: async () => {},
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
      // Send Firebase user data to our backend
      const response = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
        }),
        credentials: 'include', // Important for cookies/session
      });
      
      if (!response.ok) {
        console.error('Failed to sync user with backend:', await response.text());
      } else {
        console.log('User synced with backend successfully');
      }
    } catch (error) {
      console.error('Error syncing user with backend:', error);
    }
  };

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
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
        } catch (error) {
          console.error('Error logging out from backend:', error);
        }
      }
      
      setIsLoading(false);
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

    // Email/password registration
  const registerWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      setIsLoading(true);
      
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile to add display name
      await updateProfile(userCredential.user, {
        displayName: displayName
      });
      
      // Sync with backend
      await syncUserWithBackend(userCredential.user);
      
      toast({
        title: 'Registration successful',
        description: 'Your account has been created.',
      });
      
    } catch (error: any) {
      let errorMessage = 'Registration failed';
      console.error('Email registration error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use. Please try logging in instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.code) {
        errorMessage = `Registration error: ${error.code}`;
      }
      
      toast({
        title: 'Registration failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Email/password login
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Sign in with email and password
      await signInWithEmailAndPassword(auth, email, password);
      
      toast({
        title: 'Login successful',
        description: 'You are now logged in.',
      });
      
    } catch (error: any) {
      let errorMessage = 'Login failed';
      console.error('Email login error:', error);
      
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code) {
        errorMessage = `Login error: ${error.code}`;
      }
      
      toast({
        title: 'Login failed',
        description: errorMessage,
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
    signInWithEmail,
    registerWithEmail,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};