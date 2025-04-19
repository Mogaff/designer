import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'wouter';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // In test mode, we will allow direct access to all routes
  const testMode = true;

  // Show loading state while checking authentication
  if (isLoading && !testMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated and not in test mode, redirect to login
  if (!isAuthenticated && !testMode) {
    return <Redirect to="/login" />;
  }

  // Either authenticated or in test mode, render the children
  return <>{children}</>;
}