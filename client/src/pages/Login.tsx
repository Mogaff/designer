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
  const [email, setEmail] = useState(""); // Temporäres Login-Feld

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

  // Temporäre Notfall-Login-Funktion für Testzwecke
  const handleTemporaryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Hacky Trick: Wir simulieren einen angemeldeten Benutzer
      // Dieser Code wird nur für Entwicklungszwecke verwendet!
      const fakeUser = {
        uid: "temp-dev-user-001",
        email: email || "temp@example.com",
        displayName: "Temporary User"
      };
      
      // User im localStorage speichern
      localStorage.setItem('tempDevUser', JSON.stringify(fakeUser));
      
      // Seite neu laden, damit der AuthContext den User aus dem localStorage erkennt
      window.location.href = "/";
    } catch (error) {
      console.error('Temporary login error:', error);
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
      
      {/* Content - With temporary login form */}
      <div className="relative z-20 flex justify-center items-center min-h-screen">
        <div 
          className="rounded-xl p-6 shadow-xl bg-white/10 backdrop-blur-md" 
          style={{
            width: '320px',
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
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/20"></div>
              <span className="flex-shrink mx-3 text-white/60 text-sm">oder Temporärer Login</span>
              <div className="flex-grow border-t border-white/20"></div>
            </div>
            
            {/* Temporäres Login-Formular für Entwicklung */}
            <form onSubmit={handleTemporaryLogin} className="space-y-3">
              <div>
                <input
                  type="email"
                  placeholder="E-Mail-Adresse (optional)"
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-5 rounded-md flex items-center justify-center transition-all shadow-md w-full"
                disabled={isSubmitting}
              >
                <span className="font-medium">Temporärer Login für Tests</span>
              </button>
              <p className="text-white/60 text-xs text-center">
                Dieser Login ist nur für Entwicklungszwecke
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}