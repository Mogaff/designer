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
import { Heart, Trash2, Edit, Plus, Bookmark, ExternalLink } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";

export default function Gallery() {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
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
  
  const deleteCreation = async (id: number) => {
    if (!confirm("Are you sure you want to delete this creation?")) {
      return;
    }
    
    try {
      await apiRequest('DELETE', `/api/creations/${id}`);
      
      // Refetch the data to get the updated list
      refetch();
      
      toast({
        title: "Success",
        description: "Creation deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete creation",
        variant: "destructive",
      });
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

  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      <Header />
      
      <main className="max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Your Gallery</h1>
          <p className="text-white/70">View and manage your saved creations</p>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => (
              <Card key={index} className="overflow-hidden bg-black/40 backdrop-blur-sm border-gray-800">
                <Skeleton className="h-48 w-full" />
                <div className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : creations.length === 0 ? (
          <div className="text-center py-16 glass-panel">
            <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-gray-800 mb-4">
              <Bookmark className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No saved creations yet</h2>
            <p className="text-white/70 mb-6">Your saved designs will appear here</p>
            <Button onClick={() => window.location.href = "/"}>
              <Plus className="mr-2 h-4 w-4" /> Create new design
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  className={`h-full overflow-hidden bg-black/40 backdrop-blur-sm border-gray-800 transition-all duration-300 ${
                    selectedCard === creation.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedCard(
                    selectedCard === creation.id ? null : creation.id
                  )}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={creation.imageUrl} 
                      alt={creation.name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
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
                                // Open in a new tab or modal
                                window.open(creation.imageUrl, '_blank');
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
                                  // Edit action would go here
                                  toast({
                                    title: "Edit feature",
                                    description: "Edit functionality coming soon!"
                                  });
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
                                  deleteCreation(creation.id);
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
    </div>
  );
}