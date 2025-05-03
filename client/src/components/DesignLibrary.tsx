import React, { useState, useEffect } from 'react';
import { GeneratedFlyer } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader, Trash2, FileEdit, Download, Star, StarOff } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';

interface DesignLibraryProps {
  onSelectDesign: (design: GeneratedFlyer) => void;
  compact?: boolean;
}

export default function DesignLibrary({ onSelectDesign, compact = false }: DesignLibraryProps) {
  const [designs, setDesigns] = useState<GeneratedFlyer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('designs');
  const [selectedDesign, setSelectedDesign] = useState<GeneratedFlyer | null>(null);
  
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Load saved designs
  useEffect(() => {
    if (isAuthenticated) {
      fetchDesigns();
    }
  }, [isAuthenticated]);

  // Fetch designs from API
  const fetchDesigns = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest<API.CreationsResponse>('GET', '/api/creations');
      if (response && response.creations) {
        setDesigns(response.creations);
      }
    } catch (error) {
      console.error('Failed to fetch designs:', error);
      toast({
        title: "Failed to load designs",
        description: "There was a problem loading your saved designs.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle design selection
  const handleSelectDesign = (design: GeneratedFlyer) => {
    setSelectedDesign(design);
    onSelectDesign(design);
  };

  // Handle design deletion
  const handleDeleteDesign = async (designId: number) => {
    if (!designId) return;
    
    setIsDeleting(designId);
    try {
      await apiRequest('DELETE', `/api/creations/${designId}`);
      
      // Remove design from local state
      setDesigns(designs.filter(d => d.id !== designId));
      
      toast({
        title: "Design deleted",
        description: "Your design has been permanently deleted.",
      });
    } catch (error) {
      console.error('Failed to delete design:', error);
      toast({
        title: "Delete failed",
        description: "There was a problem deleting your design. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle design favorite toggle
  const handleToggleFavorite = async (design: GeneratedFlyer) => {
    if (!design.id) return;
    
    try {
      // Toggle favorite status
      const updatedDesign = {
        ...design,
        favorite: !design.favorite
      };
      
      await apiRequest('PUT', `/api/creations/${design.id}`, updatedDesign);
      
      // Update design in local state
      setDesigns(designs.map(d => d.id === design.id ? updatedDesign : d));
      
      toast({
        title: updatedDesign.favorite ? "Added to favorites" : "Removed from favorites",
        description: updatedDesign.favorite 
          ? "This design has been added to your favorites." 
          : "This design has been removed from your favorites.",
      });
    } catch (error) {
      console.error('Failed to update design:', error);
      toast({
        title: "Update failed",
        description: "There was a problem updating your design. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Download design image
  const handleDownloadDesign = (design: GeneratedFlyer) => {
    if (!design.imageUrl) return;
    
    const link = document.createElement("a");
    link.href = design.imageUrl;
    link.download = `${design.name || 'design'}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Design downloaded",
      description: "Your design has been downloaded as a PNG image.",
    });
  };

  if (compact) {
    // Compact view for sidebar or property panel
    return (
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-sm font-medium">Your Designs</h3>
          {isLoading && <Loader className="h-3 w-3 animate-spin text-white/70" />}
        </div>
        
        {designs.length === 0 ? (
          <div className="text-white/70 text-xs bg-black/20 p-3 rounded border border-white/10 text-center">
            {isLoading 
              ? "Loading your designs..." 
              : "You haven't saved any designs yet. Create and save a design to see it here."}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {designs.slice(0, 6).map((design) => (
              <div 
                key={design.id} 
                className="cursor-pointer group relative"
                onClick={() => handleSelectDesign(design)}
              >
                <div className="rounded overflow-hidden border border-white/10 hover:border-white/30 transition-colors">
                  <div className="aspect-square relative">
                    <img 
                      src={design.imageUrl} 
                      alt={design.name || 'Saved design'} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectDesign(design);
                    }}
                  >
                    <FileEdit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {designs.length > 6 && (
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-white/70 hover:text-white"
              onClick={() => setActiveTab('designs')}
            >
              View All Designs
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Design Library</h2>
          <TabsList>
            <TabsTrigger value="designs">My Designs</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="designs" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader className="h-6 w-6 animate-spin text-white/70" />
              <span className="ml-2 text-white/70">Loading designs...</span>
            </div>
          ) : designs.length === 0 ? (
            <div className="text-white/70 p-8 text-center bg-black/20 rounded-lg border border-white/10">
              <p className="mb-4">You haven't saved any designs yet.</p>
              <p>Create and save a design to see it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {designs.map((design) => (
                <div 
                  key={design.id} 
                  className="relative group"
                >
                  <div 
                    className="rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all hover:shadow-lg cursor-pointer hover:-translate-y-1"
                    onClick={() => handleSelectDesign(design)}
                  >
                    <div className="aspect-square relative">
                      <img 
                        src={design.imageUrl} 
                        alt={design.name || 'Saved design'} 
                        className="w-full h-full object-cover"
                      />
                      
                      {design.favorite && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-amber-500 text-white text-xs py-0.5 px-2 rounded-md">
                            <Star className="h-3 w-3 inline-block mr-1" /> Favorite
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-black/50">
                      <h3 className="text-white text-sm font-medium truncate">
                        {design.name || 'Untitled Design'}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Hover action buttons */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() => handleToggleFavorite(design)}
                        >
                          {design.favorite ? (
                            <StarOff className="h-4 w-4" />
                          ) : (
                            <Star className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {design.favorite ? 'Remove from favorites' : 'Add to favorites'}
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() => handleDownloadDesign(design)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Download design
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 p-0 bg-black/50 hover:bg-red-600 text-white"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete design</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete this design? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => document.querySelector('dialog')?.close()}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  handleDeleteDesign(design.id as number);
                                  document.querySelector('dialog')?.close();
                                }}
                                disabled={isDeleting === design.id}
                              >
                                {isDeleting === design.id ? (
                                  <>
                                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  'Delete'
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TooltipTrigger>
                      <TooltipContent>
                        Delete design
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-4">
          <div className="text-white/70 p-8 text-center bg-black/20 rounded-lg border border-white/10">
            <p className="mb-4">Templates will be available in a future update.</p>
            <p>Check back soon for pre-designed templates to use in your designs!</p>
          </div>
        </TabsContent>
        
        <TabsContent value="favorites" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader className="h-6 w-6 animate-spin text-white/70" />
              <span className="ml-2 text-white/70">Loading favorites...</span>
            </div>
          ) : designs.filter(d => d.favorite).length === 0 ? (
            <div className="text-white/70 p-8 text-center bg-black/20 rounded-lg border border-white/10">
              <p className="mb-4">You don't have any favorite designs yet.</p>
              <p>Mark designs as favorites to see them here for quick access.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {designs.filter(d => d.favorite).map((design) => (
                <div 
                  key={design.id} 
                  className="relative group"
                >
                  <div 
                    className="rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all hover:shadow-lg cursor-pointer hover:-translate-y-1"
                    onClick={() => handleSelectDesign(design)}
                  >
                    <div className="aspect-square relative">
                      <img 
                        src={design.imageUrl} 
                        alt={design.name || 'Saved design'} 
                        className="w-full h-full object-cover"
                      />
                      
                      <div className="absolute top-2 right-2">
                        <div className="bg-amber-500 text-white text-xs py-0.5 px-2 rounded-md">
                          <Star className="h-3 w-3 inline-block mr-1" /> Favorite
                        </div>
                      </div>
                    </div>
                    <div className="p-2 bg-black/50">
                      <h3 className="text-white text-sm font-medium truncate">
                        {design.name || 'Untitled Design'}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Same action buttons as above for favorites */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() => handleToggleFavorite(design)}
                        >
                          <StarOff className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Remove from favorites
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() => handleDownloadDesign(design)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Download design
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}