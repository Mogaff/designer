import { Menu, Home, LucideImage, LogIn, LogOut, User, CreditCard, Star } from "lucide-react";
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

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const [location, navigate] = useLocation();

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
        <div className="flex items-center">
          <Link href="/">
            <div className="cursor-pointer">
              <h1 className="text-xl font-semibold text-white">ha'itu</h1>
              <p className="text-[10px] text-white/50">AI-Powered Design</p>
            </div>
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Pill navigation */}
          <div className="pill-nav">
            <Link href="/">
              <button type="button" className={`pill-nav-item text-xs py-1 px-3 ${location === '/' ? 'active' : ''}`}>
                Home
              </button>
            </Link>
            <Link href="/credits">
              <button type="button" className={`pill-nav-item text-xs py-1 px-3 ${location === '/credits' ? 'active' : ''}`}>
                Credits
              </button>
            </Link>
          </div>
          
          {/* Credits display for authenticated users */}
          {isAuthenticated && creditData && (
            <div className="flex items-center mr-2">
              <Badge variant="outline" className="text-white bg-transparent border-white/20 flex items-center gap-1 py-1.5">
                <CreditCard className="h-3 w-3" />
                <span>{isLoadingCredits ? '...' : creditData.balance}</span>
                <span className="text-xs">credits</span>
                {creditData.is_premium && (
                  <Star className="h-3 w-3 text-yellow-400 ml-1" />
                )}
              </Badge>
            </div>
          )}
          
          {/* Authentication - always display with conditional content */}
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
                <Link href="/credits">
                  <DropdownMenuItem>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Get More Credits
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
