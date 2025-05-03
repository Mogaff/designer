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
  PanelLeft,
  Video,
  LayoutGrid,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import BrandKit from '@/components/BrandKit';
import { BrandKitPanel } from '@/components/BrandKitPanel';
import Templates from '@/components/Templates';
import { DesignTemplate } from '@/lib/types';

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isBrandKitPanelOpen, setIsBrandKitPanelOpen] = useState(false);
  
  // Handle template selection
  const handleSelectTemplate = (template: DesignTemplate) => {
    // Navigate to home with template selected
    window.history.pushState({
      template: template
    }, "", "/");
    
    // This will be handled by the home page component
    const templateSelectedEvent = new CustomEvent('template-selected', { 
      detail: { template } 
    });
    window.dispatchEvent(templateSelectedEvent);
  };
  
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
        <Sidebar side="left" className="sidebar border-r border-white/10 bg-white/10 backdrop-blur-md shadow-lg text-white">

          
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
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/adburst">
                    <Button variant="ghost" className={`w-full justify-start ${location === '/adburst' ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                      <Video className="h-5 w-5" />
                      <span className="sidebar-text ml-2">AdBurst</span>
                    </Button>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/editor">
                    <Button variant="ghost" className={`w-full justify-start ${location.startsWith('/editor') ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                      <Palette className="h-5 w-5" />
                      <span className="sidebar-text ml-2">Design Editor</span>
                    </Button>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            
            <SidebarSeparator className="bg-white/10" />
            
            {/* Templates Section */}
            <Templates onSelectTemplate={handleSelectTemplate} />
            
            <SidebarSeparator className="bg-white/10" />
            
            {/* Brand Kit Section */}
            <BrandKit onOpenPanel={handleOpenBrandKitPanel} />
          </SidebarContent>
          

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