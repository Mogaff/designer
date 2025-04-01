import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';

// Custom API request function for auth-related endpoints
async function apiRequest<T = any>({ 
  url, 
  method, 
  body, 
  on401 = "throw" as "returnNull" | "throw"
}: { 
  url: string; 
  method: string; 
  body?: any; 
  on401?: "returnNull" | "throw" 
}): Promise<T> {
  const headers: Record<string, string> = {};
  
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    credentials: "include"
  });
  
  if (response.status === 401 && on401 === "returnNull") {
    return null as any;
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText || `Request failed with status ${response.status}`);
  }
  
  if (response.headers.get("content-type")?.includes("application/json")) {
    return await response.json();
  }
  
  return null as any;
}

// Types for our auth context
type User = {
  id: number;
  username: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch the current user
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const response = await apiRequest({
          url: '/api/auth/user',
          method: 'GET',
          on401: 'returnNull'
        });
        return response as User | null;
      } catch (error) {
        return null;
      }
    }
  });

  // Set the user when data changes
  useEffect(() => {
    if (data) {
      setUser(data);
    } else if (!isLoading && (isError || data === null)) {
      setUser(null);
    }
  }, [data, isLoading, isError]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest({
        url: '/api/auth/login',
        method: 'POST',
        body: credentials,
        on401: 'throw'
      });
      return response as User;
    },
    onSuccess: (userData: User) => {
      setUser(userData);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${userData.username}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid username or password',
        variant: 'destructive',
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: { username: string; password: string }) => {
      const response = await apiRequest({
        url: '/api/auth/register',
        method: 'POST',
        body: userData,
        on401: 'throw'
      });
      return response as User;
    },
    onSuccess: (userData: User) => {
      toast({
        title: 'Registration Successful',
        description: 'Your account has been created! You can now log in.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Could not create your account',
        variant: 'destructive',
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest({
        url: '/api/auth/logout',
        method: 'POST',
        on401: 'returnNull'
      });
    },
    onSuccess: () => {
      setUser(null);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out',
      });
    },
    onError: () => {
      toast({
        title: 'Logout Failed',
        description: 'There was an issue logging you out',
        variant: 'destructive',
      });
    },
  });

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const register = async (username: string, password: string) => {
    await registerMutation.mutateAsync({ username, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
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