import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { login } from '../firebase';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { isLoading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      login(); // This will redirect to Google
    } catch (error) {
      console.error('Login error:', error);
      setIsSigningIn(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-black/90 backdrop-blur-md border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white text-center">Sign In to AdBurst Factory</DialogTitle>
          <DialogDescription className="text-white/70 text-center">
            Get started with 100 free credits to create amazing designs
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          <Button 
            onClick={handleGoogleSignIn}
            disabled={isLoading || isSigningIn}
            className="w-full bg-white text-black hover:bg-white/90 font-medium py-3"
          >
            {isSigningIn ? 'Signing in...' : 'Continue with Google'}
          </Button>
          
          <div className="text-center text-xs text-white/50 bg-white/10 p-2 rounded">
            <strong>Current domain:</strong><br />
            <code className="text-white/80 bg-white/10 px-1 rounded text-[10px]">
              {window.location.hostname}
            </code><br />
            Add this to Firebase authorized domains if login fails.
          </div>
          
          <div className="text-center text-sm text-white/60">
            New users get 100 credits • Premium users get unlimited access
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}