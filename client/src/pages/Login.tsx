import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';
import { GridMotion } from '@/components/ui/grid-motion';
import { designImages } from '@/assets/images';
import { useIsMobile } from '@/hooks/use-mobile';
import meshGradient from '@assets/Bildschirmfoto 2025-04-02 um 01.54.14.png';

export default function Login() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInWithGoogle, isAuthenticated } = useAuth();
  const [_, setLocation] = useLocation();
  const isMobile = useIsMobile();
  
  // AUTO-REDIRECT TO HOME (Development mode only)
  // This is a temporary fix while Firebase domain authorization is sorted out
  React.useEffect(() => {
    // Immediately redirect to the home page
    setLocation('/');
  }, []);
  
  // If already authenticated, redirect to home
  if (isAuthenticated) {
    setLocation('/');
    return null;
  }

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      // With redirect auth we don't want to wait for the promise to resolve
      // as the page will reload during the process
      signInWithGoogle();
      // We don't redirect here anymore as the redirect will happen automatically
      // and we'll check for the redirect result in the AuthContext
    } catch (error) {
      console.error('Google Sign-in error:', error);
      // Error is handled in the auth context
      setIsSubmitting(false);
    }
    // Don't set isSubmitting to false here as the page will reload
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
      
      {/* Content - Only Google Sign-In */}
      <div className="relative z-20 flex justify-center items-center min-h-screen">
        <div 
          className="rounded-xl p-6 shadow-xl bg-white/10 backdrop-blur-md" 
          style={{
            width: '280px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          <div className="space-y-4">
            <button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-5 rounded-md flex items-center justify-center gap-3 transition-all shadow-md w-full"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              <FcGoogle className="h-7 w-7 bg-white rounded-full p-1" />
              <span className="font-medium">{isSubmitting ? 'Verarbeite...' : 'Mit Google anmelden'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}