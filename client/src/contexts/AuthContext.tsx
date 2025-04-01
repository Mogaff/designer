import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Watch for Firebase auth state changes
  useEffect(() => {
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
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
    } catch (error: any) {
      let errorMessage = 'Failed to login';
      
      // Firebase auth error handling
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
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

  // Register function
  const register = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Registration Successful',
        description: 'Your account has been created! You are now logged in.',
      });
    } catch (error: any) {
      let errorMessage = 'Failed to create account';
      
      // Firebase auth error handling
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email address is already in use';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error.code) {
        errorMessage = `Registration error: ${error.code}`;
      }
      
      toast({
        title: 'Registration Failed',
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
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out',
      });
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
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};