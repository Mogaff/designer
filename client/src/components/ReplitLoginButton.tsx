import React from 'react';
import { Button } from '@/components/ui/button';

type ReplitLoginButtonProps = {
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  fullWidth?: boolean;
};

export default function ReplitLoginButton({
  className = '',
  variant = 'default',
  size = 'default',
  fullWidth = false,
}: ReplitLoginButtonProps) {
  const handleReplitLogin = () => {
    // Navigate directly to the Replit login endpoint
    window.location.href = '/api/replit/login';
  };

  return (
    <Button
      className={`${className} ${fullWidth ? 'w-full' : ''}`}
      variant={variant}
      size={size}
      onClick={handleReplitLogin}
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.5 1.5H10.5V4.5H1.5V1.5Z" fill="currentColor" />
        <path d="M10.5 4.5H7.5V10.5H10.5V4.5Z" fill="currentColor" />
        <path d="M1.5 4.5H4.5V7.5H1.5V4.5Z" fill="currentColor" />
        <path d="M4.5 7.5H7.5V10.5H4.5V7.5Z" fill="currentColor" />
      </svg>
      Login with Replit
    </Button>
  );
}