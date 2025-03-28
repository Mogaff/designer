import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, Plus, ArrowLeftIcon } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Flyer } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";
import { useState } from "react";

export default function MyFlyersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFlyer, setSelectedFlyer] = useState<Flyer | null>(null);
  
  const { data: flyers, isLoading, error } = useQuery<Flyer[], Error>({
    queryKey: ["/api/my-flyers"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });
  
  const handleDownload = (flyer: Flyer) => {
    // Extract the image URL from base64 if needed
    const imageUrl = flyer.imageUrl;
    
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `flyer-${flyer.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Downloaded",
      description: "Your flyer has been downloaded successfully",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#090a15]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#090a15] p-4 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Error Loading Flyers</h2>
        <p className="text-white/70 mb-4">{error.message}</p>
        <Button asChild>
          <Link href="/">
            <a>Go Back Home</a>
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#090a15] text-white">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white mr-2 p-0 h-8 w-8"
                asChild
              >
                <Link href="/">
                  <ArrowLeftIcon className="h-5 w-5" />
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">My Flyers</h1>
            </div>
            <Button 
              className="bg-indigo-500/80 hover:bg-indigo-500 text-white"
              size="sm"
              asChild
            >
              <Link href="/">
                <a className="flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Flyer
                </a>
              </Link>
            </Button>
          </div>
        </header>
        
        {selectedFlyer ? (
          <div className="flex flex-col items-center">
            <div className="mb-4 w-full flex justify-between items-center">
              <Button 
                variant="ghost" 
                className="text-white"
                onClick={() => setSelectedFlyer(null)}
              >
                Back to Gallery
              </Button>
              <Button 
                className="bg-indigo-500/80 hover:bg-indigo-500 text-white"
                onClick={() => handleDownload(selectedFlyer)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            
            <div className="max-w-3xl w-full mx-auto bg-black/30 backdrop-blur-md rounded-xl p-4 border border-white/10">
              <div className="relative aspect-[3/4] w-full">
                <img 
                  src={selectedFlyer.imageUrl} 
                  alt={selectedFlyer.headline || "Flyer"} 
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              
              <div className="mt-4 space-y-2">
                <h2 className="text-xl font-bold">{selectedFlyer.headline || "Untitled Flyer"}</h2>
                <p className="text-white/70">{selectedFlyer.content || selectedFlyer.stylePrompt || "No description"}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
                    Created: {new Date(selectedFlyer.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-xs bg-indigo-500/20 px-2 py-1 rounded-full">
                    Template: {selectedFlyer.template}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {flyers && flyers.length > 0 ? (
              flyers.map((flyer) => (
                <Card 
                  key={flyer.id} 
                  className="bg-black/30 backdrop-blur-md border-white/10 overflow-hidden flex flex-col h-full hover:border-indigo-500/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedFlyer(flyer)}
                >
                  <div className="aspect-[3/4] w-full relative overflow-hidden">
                    <img 
                      src={flyer.imageUrl} 
                      alt={flyer.headline || "Flyer"} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(flyer);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4 flex-grow">
                    <h3 className="font-semibold truncate mb-1">
                      {flyer.headline || "Untitled Flyer"}
                    </h3>
                    <p className="text-xs text-white/60 line-clamp-2">
                      {flyer.content || flyer.stylePrompt || "No description"}
                    </p>
                  </CardContent>
                  <CardFooter className="px-4 py-3 border-t border-white/10 bg-white/5">
                    <div className="flex justify-between items-center w-full text-xs text-white/60">
                      <span>
                        {new Date(flyer.createdAt).toLocaleDateString()}
                      </span>
                      <span className="bg-indigo-500/20 px-2 py-0.5 rounded-full">
                        {flyer.template}
                      </span>
                    </div>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-12 text-center bg-black/30 backdrop-blur-md rounded-xl border border-white/10">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
                  <Plus className="h-8 w-8 text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">No Flyers Yet</h2>
                <p className="text-white/70 mb-6 max-w-md">
                  You haven't created any flyers yet. Get started by creating your first AI-generated flyer!
                </p>
                <Button 
                  className="bg-indigo-500/80 hover:bg-indigo-500 text-white"
                  asChild
                >
                  <Link href="/">
                    <a className="flex items-center">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Flyer
                    </a>
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}