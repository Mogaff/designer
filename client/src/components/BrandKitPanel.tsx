import React, { useEffect, useRef } from 'react';
import { X, PlusCircle, Check, Edit, Trash2, PaintBucket, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { BrandKit } from '@/lib/types';
import { cn } from '@/lib/utils';

interface BrandKitPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BrandKitPanel({ isOpen, onClose }: BrandKitPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Query to fetch brand kits
  const { data: brandKits = [], isLoading, isError } = useQuery<BrandKit[]>({
    queryKey: ['/api/brand-kits'],
    queryFn: async () => {
      const response = await fetch('/api/brand-kits');
      if (!response.ok) {
        throw new Error('Failed to load brand kits');
      }
      return response.json().then((data) => data.brandKits);
    }
  });
  
  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div 
      className={cn(
        "fixed top-0 right-0 h-screen w-80 bg-black/60 backdrop-blur-md z-40 border-l border-white/10 transform transition-transform duration-300 ease-in-out shadow-xl",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
      ref={panelRef}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-medium text-white">Brand Kits</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          ) : isError ? (
            <div className="text-center text-red-500 p-2 text-sm">Failed to load brand kits</div>
          ) : (
            <div className="space-y-4">
              {brandKits.length > 0 ? (
                brandKits.map((brandKit) => (
                  <div key={brandKit.id} className="bg-white/5 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div 
                          className="h-8 w-8 rounded-md flex items-center justify-center overflow-hidden" 
                          style={{ backgroundColor: brandKit.primary_color || '#4f46e5', boxShadow: `0 0 10px ${brandKit.primary_color || '#4f46e5'}60` }}
                        >
                          {brandKit.logo_url ? (
                            <img src={brandKit.logo_url} alt="Logo" className="w-5 h-5 object-contain" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-white/70"></div>
                          )}
                        </div>
                        <span className="ml-2 font-medium text-white">{brandKit.name}</span>
                        {brandKit.is_active && (
                          <div className="ml-2 bg-green-600/20 p-0.5 px-1.5 rounded text-xs text-green-500 flex items-center">
                            <Check className="h-3 w-3 mr-1" />
                            Active
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/10 rounded-full">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/10 rounded-full">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div 
                        className="h-10 rounded-md"
                        style={{ backgroundColor: brandKit.primary_color || '#4f46e5' }}
                      ></div>
                      <div 
                        className="h-10 rounded-md"
                        style={{ backgroundColor: brandKit.secondary_color || '#a5b4fc' }}
                      ></div>
                      <div 
                        className="h-10 rounded-md"
                        style={{ backgroundColor: brandKit.accent_color || '#f59e0b' }}
                      ></div>
                    </div>
                    
                    <div className="mt-3 text-xs text-white/70">
                      <p><span className="text-white/50">Heading:</span> {brandKit.heading_font || 'Not set'}</p>
                      <p><span className="text-white/50">Body:</span> {brandKit.body_font || 'Not set'}</p>
                      {brandKit.brand_voice && (
                        <p className="mt-1 italic">{brandKit.brand_voice}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/10 mb-3">
                    <PaintBucket className="w-6 h-6 text-indigo-400" />
                  </div>
                  <p className="text-center text-white/60 mb-4">No brand kits yet</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-4 rounded-full bg-white/5 hover:bg-white/10 text-white/80 border-white/10"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create a brand kit
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-white/10">
          <Button 
            variant="default" 
            className="w-full h-10 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Brand Kit
          </Button>
        </div>
      </div>
    </div>
  );
}