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
import BrandKit from '@/components/BrandKit';
import { BrandKitPanel } from '@/components/BrandKitPanel';

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isBrandKitPanelOpen, setIsBrandKitPanelOpen] = useState(false);
  
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
  
  const handleOpenBrandKitPanel = () => {
    setIsBrandKitPanelOpen(true);
  };
  
  const handleCloseBrandKitPanel = () => {
    setIsBrandKitPanelOpen(false);
  };

  return (
    <SidebarProvider defaultCollapsed={true} collapsible={false} as="div">
      <div className="flex min-h-screen">
        <Sidebar side="left" className="sidebar border-r border-border bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white">

          
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Button variant="ghost" className={`w-full justify-start ${location === '/' ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                      <Home className="h-5 w-5" />
                      <span className="sidebar-text ml-2">Home</span>
                    </Button>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/gallery">
                    <Button variant="ghost" className={`w-full justify-start ${location === '/gallery' ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                      <Grid className="h-5 w-5" />
                      <span className="sidebar-text ml-2">Gallery</span>
                    </Button>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            
            <SidebarSeparator className="bg-white/10" />
            
            {/* Brand Kit Section */}
            <BrandKit onOpenPanel={handleOpenBrandKitPanel} />
            
            <SidebarSeparator className="bg-white/10" />
            
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/settings">
                    <Button variant="ghost" className={`w-full justify-start ${location === '/settings' ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
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
        
        {/* Brand Kit Panel */}
        <BrandKitPanel isOpen={isBrandKitPanelOpen} onClose={handleCloseBrandKitPanel} />
      </div>
    </SidebarProvider>
  );
}