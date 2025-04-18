import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  Sidebar, 
  SidebarProvider,
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarInset
} from '@/components/ui/sidebar';
import {
  Home,
  Settings,
  Grid,
  CreditCard,
  PaintBucket,
  LogOut,
  PanelLeft,
  Sparkles
} from 'lucide-react';
import gsap from 'gsap';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import BrandKit from '@/components/BrandKit';

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const logoRef = useRef<HTMLDivElement>(null);
  const sparkleRef = useRef<SVGSVGElement>(null);
  
  // Animation effect for the logo
  useEffect(() => {
    if (logoRef.current && sparkleRef.current) {
      // Initial setup
      gsap.set(sparkleRef.current, { opacity: 0, scale: 0.5 });
      
      // Create animation timeline
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 3 });
      
      tl.to(sparkleRef.current, { 
        opacity: 1, 
        scale: 1.2, 
        duration: 0.5,
        ease: "power2.out"
      })
      .to(sparkleRef.current, { 
        opacity: 0, 
        scale: 0.5, 
        duration: 0.3,
        ease: "power2.in"
      });
      
      // Pulse animation for the logo
      gsap.to(logoRef.current, {
        boxShadow: '0 0 15px 2px rgba(99, 102, 241, 0.7)',
        repeat: -1,
        yoyo: true,
        duration: 2,
        ease: "sine.inOut"
      });
    }
  }, []);
  
  // Display only the initials of the user's name
  const getUserInitials = () => {
    if (!user) return '?';
    
    const displayName = user.displayName || user.email || '';
    return displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <SidebarProvider defaultCollapsed={true} collapsible="icon" as="div">
      <div className="flex min-h-screen">
        <Sidebar side="left" className="sidebar border-r border-border bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">
          
          <SidebarHeader className="flex justify-center p-4 border-b border-white/10">
            <div 
              ref={logoRef}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-700 to-indigo-500 flex items-center justify-center relative"
              style={{ boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)' }}
            >
              <span className="text-xl font-bold text-white">AI</span>
              <Sparkles 
                ref={sparkleRef}
                className="absolute -top-1 -right-1 text-amber-400"
                size={14}
              />
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Button variant={location === '/' ? 'secondary' : 'ghost'} className="w-full justify-start">
                      <Home className="h-5 w-5" />
                      <span className="sidebar-text ml-2">Home</span>
                    </Button>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/gallery">
                    <Button variant={location === '/gallery' ? 'secondary' : 'ghost'} className="w-full justify-start">
                      <Grid className="h-5 w-5" />
                      <span className="sidebar-text ml-2">Gallery</span>
                    </Button>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            
            <SidebarSeparator className="bg-white/10" />
            
            {/* Brand Kit Section */}
            <BrandKit />
            
            <SidebarSeparator className="bg-white/10" />
            
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/settings">
                    <Button variant={location === '/settings' ? 'secondary' : 'ghost'} className="w-full justify-start">
                      <Settings className="h-5 w-5" />
                      <span className="sidebar-text ml-2">Settings</span>
                    </Button>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter className="border-t border-white/10 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 bg-emerald-700">
                  {user?.photoURL ? (
                    <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />
                  ) : (
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  )}
                </Avatar>
                <div className="ml-2 sidebar-text">
                  <p className="text-sm font-medium text-white">{user?.displayName || user?.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} className="text-white hover:bg-white/10 sidebar-text">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset className="flex-1 overflow-auto">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}