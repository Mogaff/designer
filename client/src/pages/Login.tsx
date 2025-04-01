import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';
import { Shield, AlertCircle } from 'lucide-react';

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
          <CardTitle className="text-2xl">Welcome to Flyer Creator</CardTitle>
          <CardDescription>
            Sign in with your Google account to continue
          </CardDescription>
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
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                <Shield className="h-3 w-3 inline mr-1" />
                Secure Authentication
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-2 text-center mt-2">
            <p className="text-center text-sm text-muted-foreground">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col">
          <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-md w-full">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium">
                  For Firebase Authentication to work:
                </p>
                <ul className="text-xs list-disc pl-4 mt-1 space-y-1">
                  <li>Current domain: <strong>{window.location.origin}</strong></li>
                  <li>Production domain: <strong>https://ai-flyer-genius-haitucreations.replit.app</strong></li>
                  <li>Make sure to add both domains to your Firebase Authentication console</li>
                  <li>After adding domains, it may take a few minutes for changes to propagate</li>
                </ul>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}