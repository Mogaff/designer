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
        "fixed top-20 left-[calc(var(--sidebar-collapsed-width)+8px)] w-72 max-h-[80vh] overflow-hidden rounded-lg bg-black/60 backdrop-blur-md z-40 border border-white/10 transform transition-all duration-300 ease-in-out shadow-xl",
        isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
      )}
      ref={panelRef}
    >
      <div className="flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <h2 className="text-base font-medium text-white">Brand Kits</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="overflow-y-auto p-3" style={{ maxHeight: 'calc(80vh - 120px)' }}>
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          ) : isError ? (
            <div className="text-center text-red-500 p-2 text-sm">Failed to load brand kits</div>
          ) : (
            <div className="space-y-3">
              {brandKits.length > 0 ? (
                brandKits.map((brandKit) => (
                  <div key={brandKit.id} className="bg-white/5 rounded-lg p-2.5 shadow-sm">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center">
                        <div 
                          className="h-7 w-7 rounded-md flex items-center justify-center overflow-hidden" 
                          style={{ backgroundColor: brandKit.primary_color || '#4f46e5', boxShadow: `0 0 10px ${brandKit.primary_color || '#4f46e5'}60` }}
                        >
                          {brandKit.logo_url ? (
                            <img src={brandKit.logo_url} alt="Logo" className="w-4 h-4 object-contain" />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-white/70"></div>
                          )}
                        </div>
                        <span className="ml-2 font-medium text-white text-sm">{brandKit.name}</span>
                        {brandKit.is_active && (
                          <div className="ml-2 bg-green-600/20 p-0.5 px-1.5 rounded text-xs text-green-500 flex items-center">
                            <Check className="h-2.5 w-2.5 mr-0.5" />
                            Active
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-white hover:bg-white/10 rounded-full">
                          <Edit className="h-2.5 w-2.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-white hover:bg-white/10 rounded-full">
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      <div 
                        className="h-8 rounded-md"
                        style={{ backgroundColor: brandKit.primary_color || '#4f46e5' }}
                      ></div>
                      <div 
                        className="h-8 rounded-md"
                        style={{ backgroundColor: brandKit.secondary_color || '#a5b4fc' }}
                      ></div>
                      <div 
                        className="h-8 rounded-md"
                        style={{ backgroundColor: brandKit.accent_color || '#f59e0b' }}
                      ></div>
                    </div>
                    
                    <div className="mt-2 text-xs text-white/70">
                      <p><span className="text-white/50">Heading:</span> {brandKit.heading_font || 'Not set'}</p>
                      <p><span className="text-white/50">Body:</span> {brandKit.body_font || 'Not set'}</p>
                      {brandKit.brand_voice && (
                        <p className="mt-1 italic text-xs">{brandKit.brand_voice}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500/10 mb-2">
                    <PaintBucket className="w-5 h-5 text-indigo-400" />
                  </div>
                  <p className="text-center text-white/60 mb-3 text-sm">No brand kits yet</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-3.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 border-white/10 text-xs"
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                    Create a brand kit
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-white/10">
          <Button 
            variant="default" 
            className="w-full h-8 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs"
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            Create New Brand Kit
          </Button>
        </div>
      </div>
    </div>
  );
}