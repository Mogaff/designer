import { useState, useEffect } from 'react';
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
  PanelLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import BrandKit from './BrandKit';

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
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
    <SidebarProvider defaultCollapsed={false} collapsible="icon" as="div">
      <div className="flex min-h-screen">
        <Sidebar side="left" className="border-r border-border">
          <SidebarHeader className="px-2 py-2">
            <div className="flex items-center space-x-2">
              <SidebarTrigger />
              <span className="text-lg font-semibold">DesignFlow AI</span>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Button variant={location === '/' ? 'default' : 'ghost'} className="w-full justify-start">
                      <Home className="mr-2 h-4 w-4" />
                      <span>Home</span>
                    </Button>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/gallery">
                    <Button variant={location === '/gallery' ? 'default' : 'ghost'} className="w-full justify-start">
                      <Grid className="mr-2 h-4 w-4" />
                      <span>Gallery</span>
                    </Button>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/pricing">
                    <Button variant={location === '/pricing' ? 'default' : 'ghost'} className="w-full justify-start">
                      <CreditCard className="mr-2 h-4 w-4" />
                      <span>Credits</span>
                    </Button>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            
            <SidebarSeparator />
            
            {/* Brand Kit Section */}
            <BrandKit />
            
            <SidebarSeparator />
            
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/settings">
                    <Button variant={location === '/settings' ? 'default' : 'ghost'} className="w-full justify-start">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Button>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          
          <SidebarFooter className="border-t border-border p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Avatar className="h-8 w-8">
                  {user?.photoURL ? (
                    <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />
                  ) : (
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  )}
                </Avatar>
                <div className="ml-2">
                  <p className="text-sm font-medium">{user?.displayName || user?.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={logout}>
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