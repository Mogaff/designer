import { Menu, Home, LucideImage, LogIn, LogOut, User } from "lucide-react";
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

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const [location, navigate] = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
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
              <button className={`pill-nav-item text-xs py-1 px-3 ${location === '/' ? 'active' : ''}`}>
                Home
              </button>
            </Link>
            <Link href="/gallery">
              <button className={`pill-nav-item text-xs py-1 px-3 ${location === '/gallery' ? 'active' : ''}`}>
                Gallery
              </button>
            </Link>
          </div>
          
          {/* Authentication */}
          {isAuthenticated ? (
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
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
