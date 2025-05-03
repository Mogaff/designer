import { DesignVariation } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer } from "@/lib/types";
import { CheckCircle, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { MultiColorLoading } from "@/components/ui/multi-color-loading";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedTransformationShowcase } from "@/components/AnimatedTransformationShowcase";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel";

type DesignSuggestionsProps = {
  designs: DesignVariation[] | null;
  isGenerating: boolean;
  setGeneratedFlyer: (flyer: GeneratedFlyer | null) => void;
  setDesignSuggestions: (suggestions: DesignVariation[] | null) => void;
  isCarousel?: boolean;
};

export default function DesignSuggestions({ 
  designs, 
  isGenerating, 
  setGeneratedFlyer,
  setDesignSuggestions,
  isCarousel = false
}: DesignSuggestionsProps) {
  const [selectedDesign, setSelectedDesign] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showTransformation, setShowTransformation] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  // Get aspect ratio from URL for the animated showcase
  const getAspectRatioFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ratio = urlParams.get('aspectRatio') || 'square';
    return ratio;
  };

  // Function to save design to gallery
  const saveDesignToGallery = async (design: DesignVariation) => {
    if (!isAuthenticated) return;
    setIsSaving(true);
    
    try {
      const designName = `AI Design - ${design.style}`;
      await apiRequest('POST', '/api/creations', {
        name: designName,
        imageUrl: design.imageBase64,
        headline: "AI Generated Design",
        content: `Design style: ${design.style}`,
        stylePrompt: design.style,
        template: "ai"
      });
      // Silently save - no notification displayed
    } catch (error) {
      console.error("Failed to auto-save design:", error);
      // Don't show error to user for auto-save - it happens silently
    } finally {
      setIsSaving(false);
    }
  };

  // Handle selecting a design - get the current stylePrompt from the existing flyer
  const handleSelectDesign = (design: DesignVariation) => {
    setSelectedDesign(design.id);
    
    // Create a new generated flyer from the selected design
    const newFlyer: GeneratedFlyer = {
      imageUrl: design.imageBase64,
      headline: "AI Generated Design",
      content: `Design style: ${design.style}`,
      stylePrompt: design.style, // Default to design style
      template: "ai"
    };
    
    setGeneratedFlyer(newFlyer);
    
    // Nur das erste Design beim Generieren wird in der Galerie gespeichert
    // Der FlyerPreview.tsx autoSave-Mechanismus übernimmt das Speichern
    
    // Ein Design wurde ausgewählt - keine Aktion erforderlich, da FlyerPreview.tsx es automatisch speichern wird
  };

  // Handle finalizing the design choice
  const handleUseDesign = () => {
    if (selectedDesign === null || !designs) return;
    
    // Find the selected design
    const selected = designs.find(d => d.id === selectedDesign);
    if (!selected) return;
    
    // Refresh the gallery to show newly saved designs
    queryClient.invalidateQueries({ queryKey: ['/api/creations'] });
    
    // Clear the suggestions to show only the selected design
    setDesignSuggestions(null);
  };

  if (isGenerating) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-2">
          <h2 className="text-base font-semibold text-white">Generating Designs...</h2>
        </div>
        <div className="flex-grow bg-black/20 backdrop-blur-sm rounded-xl overflow-hidden">
          <MultiColorLoading className="w-full h-full" />
        </div>
      </div>
    );
  }
  
  // Add more detailed logging about designs
  if (!designs) {
    console.error("No designs were passed to DesignSuggestions component");
    return null;
  }
  
  if (designs.length === 0) {
    console.error("Empty designs array passed to DesignSuggestions component");
    return null;
  }
  
  // Log design info for debugging
  console.log(`DesignSuggestions: Rendering ${designs.length} designs`);
  designs.forEach((design, index) => {
    console.log(`Design ${index + 1}:`, {
      id: design.id,
      hasImageBase64: !!design.imageBase64,
      base64Length: design.imageBase64 ? design.imageBase64.length : 0,
      style: design.style
    });
  });

  // This function gets the aspect ratio class based on the design style or URL
  const getAspectRatioClass = (design: DesignVariation) => {
    // Standardwert, wenn wir das Verhältnis nicht bestimmen können
    let aspectClass = "aspect-square"; 
    
    // Hole das aktuelle Aspect Ratio aus der URL
    const urlParams = new URLSearchParams(window.location.search);
    const selectedAspectRatio = urlParams.get('aspectRatio') || '';
    
    // Bestimme den CSS-Class basierend auf dem Aspect Ratio
    switch(selectedAspectRatio) {
      // Square formats
      case 'profile':
      case 'post':
      case 'square_ad':
        aspectClass = "aspect-square";
        break;
        
      // Landscape formats  
      case 'fb_cover':
      case 'facebook_cover':
        aspectClass = "aspect-[820/312]";
        break;
      case 'twitter_header':
        aspectClass = "aspect-[3/1]";
        break;
      case 'yt_thumbnail':
      case 'instream':
        aspectClass = "aspect-[16/9]";
        break;
      case 'linkedin_banner':
        aspectClass = "aspect-[4/1]";
        break;
        
      // Portrait formats
      case 'stories':
        aspectClass = "aspect-[9/16]";
        break;
      case 'pinterest':
        aspectClass = "aspect-[2/3]";
        break;
        
      // Special formats
      case 'leaderboard':
        aspectClass = "aspect-[728/90]";
        break;
      case 'skyscraper':
        aspectClass = "aspect-[160/600]";
        break;
      default:
        // Fallback: Versuche aus dem Style-Text das Aspect Ratio zu extrahieren
        if (design.style) {
          if (design.style.includes("9:16") || design.style.includes("story")) {
            aspectClass = "aspect-[9/16]";
          } else if (design.style.includes("16:9") || design.style.includes("landscape")) {
            aspectClass = "aspect-[16/9]";
          } else if (design.style.includes("4:5") || design.style.includes("portrait")) {
            aspectClass = "aspect-[4/5]";
          } else if (design.style.includes("1:1") || design.style.includes("square")) {
            aspectClass = "aspect-square";
          } else if (design.style.includes("A4") || design.style.includes("210:297")) {
            aspectClass = "aspect-[210/297]";
          }
        }
    }
    
    return aspectClass;
  };
  
  // Function to render a single design item (used by both grid and carousel)
  const renderDesignItem = (design: DesignVariation) => {
    return (
      <div 
        className={`
          relative overflow-hidden rounded-lg border-2 cursor-pointer transition-all duration-200
          ${selectedDesign === design.id 
            ? 'border-indigo-500 shadow-lg shadow-indigo-500/30' 
            : 'border-gray-800/50 hover:border-indigo-500/50 shadow shadow-white/5 hover:shadow-indigo-500/10'}
        `}
        onClick={() => handleSelectDesign(design)}
      >
        <div className={`relative ${getAspectRatioClass(design)} w-full flex items-center justify-center`}>
          {design.imageBase64 && (
            <img 
              src={design.imageBase64} 
              alt={`Design option ${design.id}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error(`Image load error for design ${design.id}`);
                const target = e.target as HTMLImageElement;
                target.onerror = null; // Prevent infinite error loop
                target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiM0MzM3ZmUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRlc2lnbiBWb3JzY2hsYWc8L3RleHQ+PC9zdmc+';
              }}
            />
          )}
          
          {/* Selection indicator */}
          {selectedDesign === design.id && (
            <div className="absolute top-2 right-2 text-indigo-500">
              <CheckCircle size={20} />
            </div>
          )}
          
          {/* Design Style Label */}
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1.5">
            <p className="text-[8px] text-white/90 truncate">{design.style}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">
          {isCarousel ? "Carousel Designs" : "Design Suggestions"}
        </h2>
        <p className="text-xs text-white/70 mb-3">
          {isCarousel 
            ? "Swipe through the carousel to view all designs" 
            : "Select one of the design variations below"
          }
        </p>
        
        {/* Explanation of process */}
        <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-lg shadow-md mb-2">
          <h3 className="font-medium text-white text-sm mb-1">
            {isCarousel ? "Carousel Design Process:" : "Design Generation Process:"}
          </h3>
          <p className="text-white/80 text-xs">
            {isCarousel ? (
              <>
                <span className="font-medium text-indigo-300">Step 1:</span> Browse through the carousel of generated designs
                <br/>
                <span className="font-medium text-indigo-300">Step 2:</span> Each design maintains a consistent style across the carousel
              </>
            ) : (
              <>
                <span className="font-medium text-indigo-300">Step 1:</span> Preview designs generated by Claude AI
                <br/>
                <span className="font-medium text-indigo-300">Step 2:</span> Select your favorite to continue to the editor for customization
              </>
            )}
          </p>
          
          {/* Transformation Showcase Button */}
          {!isCarousel && designs.length > 1 && (
            <div className="mt-2 border-t border-indigo-500/20 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full h-7 text-[10px] bg-indigo-500/30 hover:bg-indigo-500/40 text-white flex items-center gap-1"
                onClick={() => setShowTransformation(true)}
              >
                <Play className="w-3 h-3" />
                Watch Design Transformation
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-grow flex flex-col items-center justify-center relative">
        {/* Transformation Showcase Modal */}
        {showTransformation && designs.length > 1 && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900/90 border border-indigo-500/30 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-3 border-b border-indigo-500/30 flex justify-between items-center">
                <h3 className="text-white font-medium text-sm">Design Transformation Showcase</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setShowTransformation(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/70 hover:text-white">
                    <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
                  </svg>
                </Button>
              </div>
              
              <div className="p-4 flex-grow flex flex-col">
                <p className="text-white/70 text-xs mb-4">
                  Watch as your image transforms between different design styles. This visualization showcases the AI's ability to reimagine your content in multiple ways.
                </p>
                
                <div className="flex-grow relative rounded-lg overflow-hidden">
                  <AnimatedTransformationShowcase 
                    designs={designs}
                    aspectRatio={getAspectRatioFromUrl()}
                    isActive={showTransformation}
                    onComplete={() => {
                      // Optional: do something when animation completes
                    }}
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-white/60 text-[10px]">
                    Cycling through {designs.length} unique design variations
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      
        {isCarousel ? (
          /* Carousel View */
          <Carousel className="w-full max-w-md">
            <CarouselContent>
              {designs.map((design) => (
                <CarouselItem key={design.id}>
                  {renderDesignItem(design)}
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center mt-2">
              <CarouselPrevious className="relative -left-0 right-auto mx-2" />
              <CarouselNext className="relative left-0 right-auto mx-2" />
            </div>
          </Carousel>
        ) : (
          /* Grid View */
          <div className={`grid ${designs.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-3 max-h-[75vh] overflow-auto p-1 mx-auto`}>
            {designs.map((design) => (
              <div key={design.id}>
                {renderDesignItem(design)}
              </div>
            ))}
          </div>
        )}
        
        {selectedDesign !== null && (
          <Button
            onClick={handleUseDesign}
            className="mt-3 w-full font-medium rounded-md bg-indigo-500/40 backdrop-blur-sm text-white hover:bg-indigo-500/60 border-0"
          >
            Use Selected Design
          </Button>
        )}
      </div>
    </div>
  );
}