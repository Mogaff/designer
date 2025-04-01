import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';
import { GridMotion } from '@/components/ui/grid-motion';
import gradientImage1 from '../assets/image-mesh-gradient (11).png';
import gradientImage2 from '../assets/image-mesh-gradient (13).png';
import gradientImage3 from '../assets/image-mesh-gradient (18).png';

export default function Login() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInWithGoogle, isAuthenticated } = useAuth();
  const [_, setLocation] = useLocation();

  // Create a grid of image items for the background motion effect
  const gridItems = [
    gradientImage1, gradientImage2, gradientImage3,
    gradientImage2, gradientImage3, gradientImage1,
    gradientImage3, gradientImage1, gradientImage2,
    gradientImage1, gradientImage3, gradientImage2,
    gradientImage2, gradientImage1, gradientImage3,
    gradientImage3, gradientImage2, gradientImage1,
    gradientImage1, gradientImage2, gradientImage3,
    gradientImage2, gradientImage3, gradientImage1,
    gradientImage3, gradientImage1, gradientImage2,
    gradientImage1
  ];

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
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Grid Motion */}
      <div className="absolute inset-0 -z-10">
        <GridMotion 
          items={gridItems}
          gradientColor="#151133"
          className="opacity-70"
        />
      </div>
      
      {/* Login Card with Glass Effect */}
      <div className="container mx-auto flex justify-center items-center min-h-screen p-4 relative z-10">
        <Card className="w-full max-w-md bg-black/30 backdrop-blur-lg border border-white/10 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">Sign In</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Button 
                className="w-full py-6 flex items-center justify-center gap-2 bg-indigo-500/50 backdrop-blur-sm hover:bg-indigo-500/70 text-white border border-indigo-400/30"
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
    </div>
  );
}