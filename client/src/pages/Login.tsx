import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';
import { GridMotion } from '@/components/ui/grid-motion';
import { designImages } from '@/assets/images';
import { useIsMobile } from '@/hooks/use-mobile';
import meshGradient from '@assets/image-mesh-gradient (20).png';

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
      
      {/* Content - Minimalist version */}
      <div className="relative z-20 flex justify-center items-center min-h-screen">
        <div 
          className="rounded-md p-4 shadow-md" 
          style={{
            backgroundImage: `url(${meshGradient})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-5 rounded-md flex items-center justify-center gap-2 transition-all shadow-md"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
          >
            <FcGoogle className="h-5 w-5 bg-white rounded-full p-0.5" />
            <span>{isSubmitting ? 'Signing in...' : 'Continue with Google'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}