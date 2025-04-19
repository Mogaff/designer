import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentTestUserId } from '@/lib/queryClient';

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
  const [isLoading, setIsLoading] = useState(false); // No need to load
  const { toast } = useToast();

  // Set up mock user based on test user ID
  useEffect(() => {
    const testUserId = getCurrentTestUserId();
    // Create a mock user based on test user ID
    setUser({
      uid: `test-user-${testUserId}`,
      email: `test${testUserId}@example.com`,
      displayName: `Test User ${testUserId}`,
      photoURL: null
    });
  }, []);

  // Mock Google sign-in function for testing
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      console.log('Using test user authentication...');
      
      // Using a test user instead of real Google auth
      const testUserId = getCurrentTestUserId();
      setUser({
        uid: `test-user-${testUserId}`,
        email: `test${testUserId}@example.com`,
        displayName: `Test User ${testUserId}`,
        photoURL: null
      });
      
      toast({
        title: 'Test login successful',
        description: `You are now logged in as Test User ${testUserId}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: 'Test user login failed.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mock logout function for testing
  const logout = async () => {
    try {
      setIsLoading(true);
      setUser(null);
    } catch (error: any) {
      toast({
        title: 'Logout Failed',
        description: 'There was an issue logging you out',
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
    isAuthenticated: true, // Always authenticated for testing
    signInWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};