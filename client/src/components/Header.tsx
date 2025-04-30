import React, { useState, useEffect } from "react";
import { LogIn, LogOut, User, CreditCard, Star, DollarSign, Images, Settings as SettingsIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { CreditsResponse } from "@/lib/creditTypes";
import { useSidebar } from "@/components/ui/sidebar";

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const { expanded, collapsible } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);
  
  // Erkennen mobiler Geräte
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial prüfen
    checkMobile();
    
    // Event Listener für Größenänderungen
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Query user credits when authenticated
  const { data: creditData, isLoading: isLoadingCredits } = useQuery<CreditsResponse>({
    queryKey: ['/api/credits'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: isAuthenticated, // Only run when user is authenticated
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 60000, // Refetch every minute
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-2 pb-2 px-4 sm:px-6 lg:px-8">
      <div className="max-w-full mx-auto flex justify-between items-center">
        <div 
          className="flex items-center transition-all duration-300 ease-in-out"
          style={{
            transform: `translateX(${
              collapsible === "icon" 
              ? (expanded ? "16rem" : isMobile ? "8rem" : "6.5rem") 
              : isMobile ? "3.5rem" : "2.5rem"
            })`
          }}
        >
          <Link href="/">
            <div className="cursor-pointer">
              <h1 className="text-xl font-semibold text-white">ha'itu</h1>
              <p className="text-[10px] text-white/50">AI-Powered Design</p>
            </div>
          </Link>
        </div>
        
        <div className="flex items-center justify-end w-full">
          
          {/* Authentication - positioned at the far right */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-white hover:text-white hover:bg-white/10 bg-transparent border-white/20">
                  {user?.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'User'} 
                      className="h-5 w-5 rounded-full mr-2" 
                    />
                  ) : (
                    <User className="h-4 w-4 mr-1" />
                  )}
                  <span className="max-w-[100px] truncate">
                    {user?.displayName || user?.email || 'Account'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                
                {/* Credits information */}
                {creditData && (
                  <>
                    <div className="px-2 py-1.5 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span className="font-medium">{creditData.balance} Credits</span>
                        {creditData.is_premium && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            Premium
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Use credits to generate AI designs
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                {/* Navigation items */}
                <Link href="/pricing">
                  <DropdownMenuItem>
                    <DollarSign className="h-4 w-4 mr-2" />
                    View Pricing Plans
                  </DropdownMenuItem>
                </Link>

                <Link href="/gallery">
                  <DropdownMenuItem>
                    <Images className="h-4 w-4 mr-2" />
                    My Gallery
                  </DropdownMenuItem>
                </Link>

                <Link href="/settings">
                  <DropdownMenuItem>
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    Font Settings
                  </DropdownMenuItem>
                </Link>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-white hover:text-white hover:bg-white/10 bg-transparent border-white/20">
                <LogIn className="h-4 w-4 mr-1" />
                Login with Google
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
