import React, { useState, useEffect } from "react";
import { 
  SidebarGroup, 
  SidebarGroupLabel, 
  SidebarGroupAction 
} from '@/components/ui/sidebar';
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import TemplateGallery from "./TemplateGallery";
import { DesignTemplate } from "@/lib/types";

interface TemplatesProps {
  onSelectTemplate: (template: DesignTemplate) => void;
}

export default function Templates({ onSelectTemplate }: TemplatesProps) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Handle ESC key press to close the gallery
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isGalleryOpen) {
        setIsGalleryOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscKey);
    
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [isGalleryOpen]);

  const handleTemplateSelect = (template: DesignTemplate) => {
    onSelectTemplate(template);
    setIsGalleryOpen(false);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel 
        className="flex items-center justify-between text-white cursor-pointer"
        onClick={() => setIsGalleryOpen(true)}
      >
        <div className="flex items-center">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-cyan-600 to-blue-700">
            <LayoutGrid className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="sidebar-text ml-2 uppercase font-medium tracking-wide text-xs">Templates</span>
        </div>
        <SidebarGroupAction asChild>
          <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-white hover:bg-white/10 rounded-full sidebar-text"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent 
              className="sm:max-w-5xl max-h-[calc(100vh-80px)] p-0 bg-transparent border-none overflow-hidden"
              aria-label="Design Templates Gallery" 
              aria-describedby="gallery-desc"
            >
              {/* Add DialogTitle and DialogDescription to fix accessibility warnings (can hide them visually) */}
              <DialogTitle className="sr-only">Design Templates Gallery</DialogTitle>
              <DialogDescription className="sr-only" id="gallery-desc">
                Select a design template to start your project with predefined styles and layouts
              </DialogDescription>
              <TemplateGallery 
                onSelectTemplate={handleTemplateSelect} 
                onClose={() => setIsGalleryOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </SidebarGroupAction>
      </SidebarGroupLabel>
    </SidebarGroup>
  );
}