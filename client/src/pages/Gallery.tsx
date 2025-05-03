import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { UserCreation } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Trash2, 
  Edit, 
  Plus, 
  Bookmark, 
  ExternalLink, 
  X, 
  Download, 
  Copy, 
  Share2 
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";

export default function Gallery() {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedCreation, setSelectedCreation] = useState<UserCreation | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  
  // Define interface for API response
  interface CreationsResponse {
    creations: UserCreation[];
  }
  
  // Fetch user creations
  const { data, isLoading, error, refetch } = useQuery<CreationsResponse>({
    queryKey: ['/api/creations'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: isAuthenticated,
  });
  
  const creations = data?.creations || [];
  
  const toggleFavorite = async (id: number, isFavorite: boolean) => {
    try {
      await apiRequest(
        'PUT', 
        `/api/creations/${id}`, 
        { favorite: !isFavorite }
      );
      
      // Refetch the data to get the updated list
      refetch();
      
      toast({
        title: "Success",
        description: !isFavorite 
          ? "Added to favorites" 
          : "Removed from favorites",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    }
  };
  
  // State für Lösch-Bestätigungsdialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingCreationId, setDeletingCreationId] = useState<number | null>(null);
  
  const confirmDeleteCreation = (id: number) => {
    setDeletingCreationId(id);
    setDeleteConfirmOpen(true);
  };
  
  const deleteCreation = async (id: number) => {
    // Der Dialog sollte bereits geschlossen sein, wenn diese Funktion aufgerufen wird
    try {
      await apiRequest('DELETE', `/api/creations/${id}`);
      
      // Refetch the data to get the updated list
      refetch();
      
      toast({
        title: "Erfolg",
        description: "Design wurde erfolgreich gelöscht",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Das Design konnte nicht gelöscht werden",
        variant: "destructive",
      });
    } finally {
      // Zurücksetzen des zu löschenden Designs
      setDeletingCreationId(null);
    }
  };
  
  // If an error occurred
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load your creations",
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  // Handler for opening the detailed preview
  const handleOpenPreview = (creation: UserCreation) => {
    setSelectedCreation(creation);
    setPreviewOpen(true);
  };
  
  // Handler for downloading the design
  const handleDownload = () => {
    if (!selectedCreation) return;

    const link = document.createElement("a");
    link.href = selectedCreation.imageUrl;
    link.download = `${selectedCreation.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler for sharing the design
  const handleShare = async () => {
    if (!selectedCreation) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedCreation.name,
          text: "Check out this design I created!",
          url: selectedCreation.imageUrl,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      toast({
        title: "Share not supported",
        description: "Sharing is not supported on this browser",
      });
    }
  };
  
  // Copy prompt to clipboard
  const copyPromptToClipboard = () => {
    if (!selectedCreation?.stylePrompt) return;
    
    navigator.clipboard.writeText(selectedCreation.stylePrompt)
      .then(() => {
        setPromptCopied(true);
        toast({
          title: "Prompt copied!",
          description: "The prompt has been copied to your clipboard",
        });
        
        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setPromptCopied(false);
        }, 2000);
      })
      .catch(() => {
        toast({
          title: "Copy failed",
          description: "Failed to copy the prompt to clipboard",
          variant: "destructive",
        });
      });
  };

  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      <Header />
      
      <main className="max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Your Gallery</h1>
          <p className="text-white/70">View and manage your saved creations</p>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
            {[...Array(8)].map((_, index) => (
              <Card key={index} className="overflow-hidden bg-black/40 backdrop-blur-sm border-gray-800/50 shadow-lg">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <div className="flex justify-between">
                    <Skeleton className="h-8 w-16" />
                    <div className="flex gap-1">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : creations.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-xl shadow-lg border border-white/5">
            <div className="inline-flex justify-center items-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-900/30 to-purple-900/30 backdrop-blur-md mb-4 shadow-lg border border-white/10">
              <Bookmark className="h-10 w-10 text-indigo-300" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">No saved creations yet</h2>
            <p className="text-white/70 mb-6 max-w-md mx-auto">Create your first design to see it in your gallery</p>
            <Button 
              onClick={() => window.location.href = "/"} 
              className="bg-indigo-500/60 backdrop-blur-md text-white hover:bg-indigo-500/80 border-0 shadow-lg px-6 py-2"
            >
              <Plus className="mr-2 h-4 w-4" /> Create your first design
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
            {creations.map((creation: UserCreation) => (
              <motion.div
                key={creation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ y: -5 }}
                className="h-full"
              >
                <Card 
                  className={`h-full overflow-hidden bg-black/40 backdrop-blur-sm border-gray-800/50 shadow-lg transition-all duration-300 ${
                    selectedCard === creation.id ? 'ring-2 ring-indigo-500' : ''
                  }`}
                  onClick={() => {
                    // Set selected card for visual highlight
                    setSelectedCard(selectedCard === creation.id ? null : creation.id);
                    // Open preview dialog
                    handleOpenPreview(creation);
                  }}
                >
                  <div className="relative aspect-square overflow-hidden group">
                    <img 
                      src={creation.imageUrl} 
                      alt={creation.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(creation.id, creation.favorite);
                              }}
                            >
                              <Heart
                                className={`h-4 w-4 ${
                                  creation.favorite ? 'fill-red-500 text-red-500' : 'text-white'
                                }`}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {creation.favorite ? 'Remove from favorites' : 'Add to favorites'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="font-medium text-white truncate">{creation.name}</h3>
                    <p className="text-sm text-white/60 mb-3">
                      {creation.created_at ? 
                        (typeof creation.created_at === 'string' ? 
                          new Date(creation.created_at).toLocaleDateString() : 
                          creation.created_at instanceof Date ? 
                            creation.created_at.toLocaleDateString() : 
                            'Invalid date'
                        ) : 
                        'No date'
                      }
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white/70 hover:text-white p-0 h-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Open our preview dialog
                                handleOpenPreview(creation);
                              }}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View full size</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <div className="flex space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white/70 hover:text-white hover:bg-transparent"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Navigate to the design editor with this creation's ID
                                  window.location.href = `/editor/${creation.id}`;
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white/70 hover:text-red-500 hover:bg-transparent"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDeleteCreation(creation.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      
      <Footer />
      
      {/* Verbesserte Design-Vorschau im Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl bg-black/90 backdrop-blur-xl border-gray-800/50 shadow-xl text-white p-0 overflow-hidden rounded-xl">
          {selectedCreation && (
            <div className="flex flex-col h-full">
              {/* Header mit Aktionen */}
              <div className="flex justify-between items-center p-4 border-b border-gray-800/50 bg-gradient-to-r from-indigo-900/20 to-purple-900/20">
                <h2 className="text-xl font-semibold text-white">{selectedCreation.name}</h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-8 w-8 hover:bg-black/20"
                  onClick={() => setPreviewOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Verbesserte Bild-Vorschau mit Hintergrund */}
              <div className="relative flex-grow flex items-center justify-center p-6 bg-gradient-to-b from-gray-900/50 to-black/50">
                <img 
                  src={selectedCreation.imageUrl} 
                  alt={selectedCreation.name} 
                  className="max-h-[65vh] max-w-full object-contain rounded-md shadow-2xl border border-white/5"
                  loading="lazy"
                />
              </div>
              
              {/* Verbesserter Footer mit Details und Aktionen */}
              <div className="p-5 border-t border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-black/50 flex flex-col gap-3">
                {/* Design Metadaten */}
                <div className="flex flex-col gap-2">
                  {selectedCreation.headline && (
                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-semibold text-white/80">Headline</h3>
                      <p className="text-sm bg-black/20 p-2 rounded-md border border-gray-800/30 text-white/90">
                        {selectedCreation.headline}
                      </p>
                    </div>
                  )}
                  
                  {selectedCreation.content && (
                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-semibold text-white/80">Content</h3>
                      <p className="text-sm bg-black/20 p-2 rounded-md border border-gray-800/30 text-white/90">
                        {selectedCreation.content}
                      </p>
                    </div>
                  )}
                  
                  {/* Zeige den Prompt mit einem Kopier-Button an */}
                  {selectedCreation.stylePrompt && (
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white/80">Style Prompt</h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={copyPromptToClipboard}
                          className="h-7 px-2 rounded-full hover:bg-white/10 text-xs"
                        >
                          <Copy className={`h-3.5 w-3.5 mr-1 ${promptCopied ? 'text-green-500' : 'text-white/70'}`} />
                          {promptCopied ? 'Copied!' : 'Copy prompt'}
                        </Button>
                      </div>
                      <div className="text-xs bg-black/30 p-3 rounded-md border border-indigo-900/30 text-white/80 font-mono">
                        {selectedCreation.stylePrompt}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Aktions-Buttons in einer abgesetzten Zeile */}
                <div className="flex justify-between gap-2 mt-3 pt-3 border-t border-gray-800/30">
                  {/* Löschbutton links */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-900/30 bg-red-500/10 text-white hover:bg-red-500/20"
                    onClick={() => {
                      if (selectedCreation) {
                        setPreviewOpen(false); // Schließe den Dialog
                        setTimeout(() => {
                          // Verzögerung, damit der Dialog zuerst schließt
                          confirmDeleteCreation(selectedCreation.id);
                        }, 100);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Löschen
                  </Button>
                  
                  {/* Rechts ausgerichtete Aktionsbuttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-indigo-700/50 bg-indigo-500/10 text-white hover:bg-indigo-500/20"
                      onClick={() => {
                        if (selectedCreation) {
                          setPreviewOpen(false); // Close the dialog
                          // Navigate to editor
                          window.location.href = `/editor/${selectedCreation.id}`;
                        }
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Design
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700/50 bg-black/20 text-white hover:bg-black/40"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700/50 bg-black/20 text-white hover:bg-black/40"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={selectedCreation.favorite ? "default" : "outline"}
                            size="sm"
                            className={selectedCreation.favorite 
                              ? "bg-red-500/20 border-red-900/30 text-white hover:bg-red-500/30" 
                              : "border-gray-700/50 bg-black/20 text-white hover:bg-black/40"}
                            onClick={() => toggleFavorite(selectedCreation.id, selectedCreation.favorite)}
                          >
                            <Heart className={`h-4 w-4 mr-1 ${selectedCreation.favorite ? 'fill-red-500 text-red-500' : ''}`} />
                            {selectedCreation.favorite ? 'Favorited' : 'Add to favorites'}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {selectedCreation.favorite ? 'Remove from favorites' : 'Add to favorites'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Löschbestätigungsdialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-black/95 backdrop-blur-xl border-gray-800/50 text-white p-6 max-w-md rounded-xl">
          <DialogTitle className="text-xl font-semibold text-white mb-2">
            Design löschen
          </DialogTitle>
          <div className="py-3">
            <p className="text-white/80 text-sm mb-4">
              Bist du sicher, dass du dieses Design löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-800"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white border-0"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  if (deletingCreationId !== null) {
                    deleteCreation(deletingCreationId);
                  }
                }}
              >
                Löschen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}