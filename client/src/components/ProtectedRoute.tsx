import React, { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'wouter';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [backendChecked, setBackendChecked] = useState(false);
  const [backendAuthenticated, setBackendAuthenticated] = useState(false);

  // Check with the backend if we're actually authenticated there
  // This handles the development mode auto-login scenario
  useEffect(() => {
    async function checkBackendAuth() {
      try {
        // Ping the user endpoint to see if we're authenticated on the backend
        const response = await fetch('/api/auth/user', {
          credentials: 'include' // Send cookies, if any
        });
        
        if (response.ok) {
          // We're authenticated with the backend
          setBackendAuthenticated(true);
        }
      } catch (error) {
        console.error('Error checking backend auth:', error);
      } finally {
        setBackendChecked(true);
      }
    }
    
    // Only run the check if we're not authenticated via Firebase
    if (!isAuthenticated && !isLoading) {
      checkBackendAuth();
    }
  }, [isAuthenticated, isLoading]);

  // Show loading state while checking authentication
  if (isLoading || (!isAuthenticated && !backendChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If authenticated via Firebase or backend, render the children
  if (isAuthenticated || backendAuthenticated) {
    return <>{children}</>;
  }
  
  // Otherwise, redirect to login
  return <Redirect to="/login" />;
}