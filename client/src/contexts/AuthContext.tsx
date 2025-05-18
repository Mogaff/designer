import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  auth, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  googleProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from '@/lib/firebase';
import { Auth } from 'firebase/auth';
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
  // Authentication enabled to use Firebase
  // Set AUTH_ENABLED to false to use mock user
  const AUTH_ENABLED = true;
  
  const mockUser: User = {
    uid: 'temp-user-123',
    email: 'temp@example.com',
    displayName: 'Temporary User',
    photoURL: null
  };
  
  const [user, setUser] = useState<User | null>(AUTH_ENABLED ? null : mockUser);
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

  // Watch auth state changes and handle redirect result
  useEffect(() => {
    // If authentication is disabled, just set loading to false and use mock user
    if (!AUTH_ENABLED) {
      console.log('Authentication DISABLED. Using mock user.');
      setIsLoading(false);
      return () => {};
    }
    
    // Watch Firebase auth state if authentication is enabled
    console.log('Authentication ENABLED. Watching Firebase auth state.');
    
    // Handle redirect result first
    (async function checkRedirectResult() {
      try {
        // Check if we're coming back from a redirect sign-in
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('Redirect login successful:', result.user.email);
          
          // Sync with our backend
          await syncUserWithBackend(result.user);
          
          toast({
            title: 'Login successful',
            description: 'You are now logged in with Google.',
          });
        }
      } catch (error: any) {
        console.error('Error handling redirect result:', error);
        
        if (error.code === 'auth/unauthorized-domain') {
          toast({
            title: 'Login failed',
            description: 'Authentication problem: This domain must be authorized in Firebase.',
            variant: 'destructive',
          });
        }
      }
    })();
    
    // Then set up the normal auth state listener
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
  }, [toast, AUTH_ENABLED]);

  // Google Sign-in function using redirect method
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      
      // If authentication is disabled, use the mock user
      if (!AUTH_ENABLED) {
        console.log('Authentication disabled: Simulating Google login');
        
        toast({
          title: 'Login successful',
          description: 'You are now logged in (Auth disabled mode).',
        });
        
        return;
      }
      
      console.log('Starting Google sign-in with redirect...');
      
      // Use redirect method instead of popup
      await signInWithRedirect(auth, googleProvider);
      
      // The page will redirect to Google and then back to our app
      // The result will be handled in useEffect below
      
    } catch (error: any) {
      let errorMessage = 'Google login failed';
      console.error('Google sign-in error:', error);
      
      // Better error messages for common errors
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'Authentication problem: This domain must be authorized in the Firebase console.';
        console.error('Domain not authorized:', window.location.origin);
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
      
      // If authentication is disabled, just simulate logout
      if (!AUTH_ENABLED) {
        console.log('Authentication disabled: Simulating logout');
        
        // We won't actually log out in disabled mode, as we want to stay "logged in"
        toast({
          title: 'Logout simulated',
          description: 'Auth is disabled, staying logged in with mock user',
        });
        
        return;
      }
      
      // Normal logout flow using the renamed function
      await firebaseSignOut(auth);
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
      
      // If authentication is disabled, use the mock user
      if (!AUTH_ENABLED) {
        console.log('Authentication disabled: Simulating email registration');
        
        toast({
          title: 'Registration successful',
          description: 'Your account has been created (Auth disabled mode).',
        });
        
        return;
      }
      
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
      
      // If authentication is disabled, use the mock user
      if (!AUTH_ENABLED) {
        console.log('Authentication disabled: Simulating email login');
        
        toast({
          title: 'Login successful',
          description: 'You are now logged in (Auth disabled mode).',
        });
        
        return;
      }
      
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