import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';
import { GridMotion } from '@/components/ui/grid-motion';
import { designImages } from '@/assets/images';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Login() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInWithGoogle, isAuthenticated } = useAuth();
  const [_, setLocation] = useLocation();
  const isMobile = useIsMobile();

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

  // Create an array of image URLs for GridMotion
  const imageItems = designImages.map(img => img);
  
  // Duplicate items to fill the grid if needed
  while (imageItems.length < 28) {
    imageItems.push(...designImages);
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background Grid Motion with images */}
      <div className="absolute inset-0 z-0">
        <GridMotion 
          items={imageItems} 
          gradientColor="rgba(0,0,0,0.3)"
        />
      </div>
      
      {/* Overlay with gradient - lighter opacity */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-black/20 to-black/40" />
      
      {/* Content */}
      <div className="relative z-20 container mx-auto flex flex-col justify-center items-center min-h-screen p-4">
        <div className="w-full max-w-md text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">HA'ITU</h1>
          <p className="text-white/70 text-lg">
            Revolutionizing design with AI-powered image generation
          </p>
        </div>
        
        <Card className="w-full max-w-md border-0 bg-black/30 backdrop-blur-md text-white border border-white/10">
          <CardHeader className="text-center border-b border-white/10 pb-4">
            <CardTitle className="text-2xl text-white">Sign In</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col space-y-2">
              <Button 
                variant="outline" 
                className="w-full py-6 flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
              >
                <FcGoogle className="h-5 w-5" />
                <span>{isSubmitting ? 'Signing in...' : 'Continue with Google'}</span>
              </Button>
            </div>
            
            <div className="text-center text-sm text-white/50">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}