import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';

export default function Login() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInWithGoogle, isAuthenticated } = useAuth();
  const [_, setLocation] = useLocation();

  // If already authenticated, redirect to home
  if (isAuthenticated) {
    setLocation('/');
    return null;
  }

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      setLocation('/');
    } catch (error) {
      // Error is handled in the auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Button 
              variant="outline" 
              className="w-full py-6 flex items-center justify-center gap-2"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              <FcGoogle className="h-5 w-5" />
              <span>{isSubmitting ? 'Signing in...' : 'Continue with Google'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}