import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';
import { GridMotion } from '@/components/ui/grid-motion';

// Import flyer design images
import design1 from '../assets/design-images/design1.png';
import design2 from '../assets/design-images/design2.png';
import design3 from '../assets/design-images/design3.png';
import design4 from '../assets/design-images/design4.png';
import design5 from '../assets/design-images/design5.png';
import design6 from '../assets/design-images/design6.png';
import design7 from '../assets/design-images/design7.png';
import design8 from '../assets/design-images/design8.png';
import design9 from '../assets/design-images/design9.png';

export default function Login() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInWithGoogle, isAuthenticated } = useAuth();
  const [_, setLocation] = useLocation();

  // Create a grid of design image items for the background motion effect
  const gridItems = [
    design1, design2, design3, design4, design5, design6, design7,
    design8, design9, design1, design2, design3, design4, design5,
    design6, design7, design8, design9, design1, design2, design3,
    design4, design5, design6, design7, design8, design9, design1,
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
          className="opacity-90"
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