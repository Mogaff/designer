import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FcGoogle } from 'react-icons/fc';

// Import background image
import loginBg from '../assets/login-background.png';

export default function Login() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInWithGoogle, isAuthenticated } = useAuth();
  const [_, setLocation] = useLocation();

  // Set up mouse move effect for background parallax
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
      {/* Background Image with Parallax Effect */}
      <div 
        className="absolute inset-0 bg-cover bg-center -z-10"
        style={{
          backgroundImage: `url(${loginBg})`,
          transform: `scale(1.1) translateX(${mousePosition.x * -20}px) translateY(${mousePosition.y * -20}px)`
        }}
      ></div>
      
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/60 to-black/70 -z-5"></div>
      
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