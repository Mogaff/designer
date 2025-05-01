import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Download, Share2, Ratio, Check, Copy } from "lucide-react";
import { MultiColorLoading } from "@/components/ui/multi-color-loading";
import iconUpload from "../assets/iconupload.png";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type FlyerPreviewProps = {
  generatedFlyer: GeneratedFlyer | null;
  isGenerating: boolean;
  aspectRatio?: string;
  showProgress?: boolean;
};

export default function FlyerPreview({ 
  generatedFlyer, 
  isGenerating,
  aspectRatio: initialAspectRatio,
  showProgress = false
}: FlyerPreviewProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>(initialAspectRatio || "profile");
  const [promptCopied, setPromptCopied] = useState(false);
  const [autoSaveAttempted, setAutoSaveAttempted] = useState(false);
  
  // Generation progress visualization state
  const [progressSteps, setProgressSteps] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [showGenerationProgress, setShowGenerationProgress] = useState(false);
  
  type AspectRatioOption = {
    id: string;
    label: string;
    value: string;
  };
  
  const aspectRatioOptions: AspectRatioOption[] = [
    // Square formats
    { id: "profile", label: "Instagram Profile (1080×1080)", value: "1/1" },
    { id: "post", label: "Social Media Post (1200×1200)", value: "1/1" },
    
    // Landscape formats
    { id: "fb_cover", label: "Facebook Cover (820×312)", value: "820/312" },
    { id: "twitter_header", label: "Twitter Header (1500×500)", value: "3/1" },
    { id: "yt_thumbnail", label: "YouTube Thumbnail (1280×720)", value: "16/9" },
    { id: "linkedin_banner", label: "LinkedIn Banner (1584×396)", value: "4/1" },
    
    // Video/Ad formats
    { id: "instream", label: "Video Ad (1920×1080)", value: "16/9" },
    { id: "stories", label: "Instagram Stories (1080×1920)", value: "9/16" },
    { id: "pinterest", label: "Pinterest Pin (1000×1500)", value: "2/3" },
    
    // Display Ad formats
    { id: "leaderboard", label: "Leaderboard Ad (728×90)", value: "728/90" },
    { id: "square_ad", label: "Square Ad (250×250)", value: "1/1" },
    { id: "skyscraper", label: "Skyscraper Ad (160×600)", value: "160/600" },
  ];
  
  // FIXED MAY 1, 2025: Improved container dimensions calculation to correctly maintain aspect ratios
  // Get the selected aspect ratio value (e.g. "16/9", "1/1", etc.)
  const getAspectRatioValue = (ratio: string): string => {
    const option = aspectRatioOptions.find(o => o.id === ratio);
    return option?.value || "1/1"; // Default to square if not found
  };
  
  // Calculate width and height while maintaining the proper aspect ratio
  const getContainerDimensions = (ratio: string): { width: string, height: string } => {
    const ratioValue = getAspectRatioValue(ratio);
    let [width, height] = ratioValue.split('/').map(Number);
    
    // Ensure values are valid numbers
    if (!width || !height) {
      width = 1;
      height = 1;
    }
    
    // Base size for different aspect ratio categories - INCREASED MAY 1, 2025
    let baseSize = 800; // Default base size - INCREASED FROM 500
    
    // Adjust the base size for extreme aspect ratios
    if (ratio === 'leaderboard') {
      baseSize = 1200; // Special case for leaderboard ad - INCREASED FROM 728 
    } else if (width/height >= 3) {
      baseSize = 1300; // Extra wide formats (banners) - INCREASED FROM 800
    } else if (height/width >= 3) {
      baseSize = 600; // Extra tall formats (skyscraper) - INCREASED FROM 350
    } else if (width/height > 1.2) {
      baseSize = 1000; // Landscape formats - INCREASED FROM 600
    } else if (height/width > 1.2) {
      baseSize = 800; // Portrait formats - INCREASED FROM 450
    } else {
      baseSize = 800; // Square-ish formats - INCREASED FROM 500
    }
    
    // Calculate dimensions while maintaining aspect ratio
    let calcWidth, calcHeight;
    
    if (width >= height) {
      // Landscape or square: fix width, calculate height
      calcWidth = baseSize;
      calcHeight = Math.round(baseSize * (height/width));
    } else {
      // Portrait: fix height, calculate width
      calcHeight = baseSize;
      calcWidth = Math.round(baseSize * (width/height));
    }
    
    return {
      width: `${calcWidth}px`,
      height: `${calcHeight}px`
    };
  };
  
  // Helper functions that use the container dimensions calculation
  const getContainerWidth = (ratio: string): string => {
    return getContainerDimensions(ratio).width;
  };

  const getContainerHeight = (ratio: string): string => {
    return getContainerDimensions(ratio).height;
  };
  
  // Update aspectRatio when prop changes
  useEffect(() => {
    // Always update when initialAspectRatio changes, regardless of whether it has a value
    // This ensures the preview container shape updates immediately when a new aspect ratio is selected
    setAspectRatio(initialAspectRatio || "profile");
  }, [initialAspectRatio]);

  // Set up generation progress visualization
  useEffect(() => {
    if (showProgress && isGenerating) {
      setShowGenerationProgress(true);
      setProgressSteps([
        "Analyzing request...",
        "Planning design layout...",
        "Generating visual elements...",
        "Applying style adjustments...",
        "Finalizing design..."
      ]);
      
      // Start at 25% immediately to give a feeling of faster progress
      setProgressPercent(25);
      
      // Accelerated progress simulation - faster initial progress
      const simulateProgress = () => {
        // Move quickly to 90% then slow down for the final steps
        const interval = setInterval(() => {
          setProgressPercent(prevPercent => {
            if (prevPercent < 50) {
              // Move quickly to 50%
              return prevPercent + 5;
            } else if (prevPercent < 80) {
              // Slightly slower to 80%
              return prevPercent + 3;
            } else if (prevPercent < 90) {
              // Even slower to 90%
              return prevPercent + 1;
            }
            // Hold at 90% until generation completes
            return 90;
          });
        }, 100); // Faster interval
        
        return interval;
      };
      
      const progressInterval = simulateProgress();
      
      return () => {
        clearInterval(progressInterval);
      };
    } else if (!isGenerating && showGenerationProgress) {
      // When generation completes, quickly show 100%
      setProgressPercent(100);
      
      // After a brief delay, hide the progress indicator
      const hideTimeout = setTimeout(() => {
        setShowGenerationProgress(false);
        setProgressPercent(0);
      }, 800);
      
      return () => {
        clearTimeout(hideTimeout);
      };
    } else if (!showProgress) {
      setShowGenerationProgress(false);
      setProgressPercent(0);
    }
  }, [showProgress, isGenerating]);
  
  // Speichern wir die letzte Bild-URL, um doppelte Speicherungen zu vermeiden
  const lastSavedImageUrlRef = useRef<string | null>(null);
  
  // Reset autoSaveAttempted when a new flyer is set with a different image URL
  useEffect(() => {
    // Wenn ein neuer Flyer gesetzt wird mit einer anderen URL als der zuletzt gespeicherten
    if (generatedFlyer && generatedFlyer.imageUrl !== lastSavedImageUrlRef.current) {
      setAutoSaveAttempted(false);
    }
  }, [generatedFlyer?.imageUrl]); // Nur zurücksetzen, wenn sich die Bild-URL ändert

  // Manual save function for flyers - no more auto-save
  const saveDesignToGallery = async () => {
    if (!generatedFlyer || !isAuthenticated) return;
    
    setIsSaving(true);
    
    try {
      const imageUrl = generatedFlyer.imageUrl;
      
      // Track the URL to avoid duplicates
      lastSavedImageUrlRef.current = imageUrl;
      
      // Create a better, more unique name for the design
      const timestamp = new Date().toLocaleTimeString();
      const designName = generatedFlyer.headline || 
        `${generatedFlyer.stylePrompt ? 
          `Design: ${generatedFlyer.stylePrompt.slice(0, 20)}...` : 
          `Design ${timestamp}`}`;
          
      await apiRequest('POST', '/api/creations', {
        name: designName,
        imageUrl: generatedFlyer.imageUrl,
        headline: generatedFlyer.headline || null,
        content: generatedFlyer.content || null,
        stylePrompt: generatedFlyer.stylePrompt || null,
        template: generatedFlyer.template || null,
      });
      
      toast({
        title: "Design saved!",
        description: "Your design has been saved to your gallery."
      });
      
    } catch (error) {
      console.error("Error saving design:", error);
      toast({
        title: "Save failed",
        description: "There was a problem saving your design. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!generatedFlyer) return;

    const link = document.createElement("a");
    link.href = generatedFlyer.imageUrl;
    link.download = `design-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!generatedFlyer) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Generated Design",
          text: "Check out this design I created!",
          url: generatedFlyer.imageUrl,
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
  
  const copyPromptToClipboard = () => {
    if (!generatedFlyer?.stylePrompt) return;
    
    navigator.clipboard.writeText(generatedFlyer.stylePrompt)
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
    <div className="h-full flex flex-col">
      {/* Preview toolbar - Glass Effect Icons (50% smaller) */}
      <div className="absolute top-2 right-3 z-30 flex gap-1 scale-75 origin-top-right">
        <Button
          size="sm" 
          className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm rounded-full w-6 h-6 p-0 shadow border border-white/10"
          onClick={saveDesignToGallery}
          disabled={!generatedFlyer || isSaving}
          title="Save"
        >
          {isSaving ? (
            <span className="h-3 w-3 animate-spin">⏳</span>
          ) : (
            <Check className="h-3 w-3" />
          )}
        </Button>
        
        <Button
          size="sm" 
          className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm rounded-full w-6 h-6 p-0 shadow border border-white/10"
          onClick={handleDownload}
          disabled={!generatedFlyer}
          title="Download"
        >
          <Download className="h-3 w-3" />
        </Button>
        
        <Button
          size="sm" 
          className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm rounded-full w-6 h-6 p-0 shadow border border-white/10"
          onClick={handleShare}
          disabled={!generatedFlyer}
          title="Share"
        >
          <Share2 className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="bg-transparent h-full w-full flex flex-col items-center justify-center relative">
        
        
        {!generatedFlyer && !isGenerating ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div 
              className="relative flex items-center justify-center overflow-hidden backdrop-blur-md bg-white/5 border border-white/10 mx-auto rounded-lg"
              style={{
                maxWidth: '95%',
                maxHeight: '95%',
                padding: '0.5rem',
                width: getContainerWidth(aspectRatio),
                height: getContainerHeight(aspectRatio),
              }}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <img src={iconUpload} alt="Upload icon" className="h-20 w-20 mb-3" />
                <h3 className="text-base font-medium text-white/90">Your design will appear here</h3>
              </div>
              
              {/* Aspect ratio label for empty state */}
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white/80 text-[10px] px-2 py-1">
                {aspectRatioOptions.find(o => o.id === aspectRatio)?.label || aspectRatio}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col">
            <div className="flex-grow flex items-center justify-center">
              <div 
                className="relative flex items-center justify-center overflow-hidden backdrop-blur-md bg-white/5 border border-white/10 mx-auto rounded-lg"
                style={{
                  maxWidth: '95%', 
                  maxHeight: '95%',
                  padding: '0.5rem',
                  width: getContainerWidth(aspectRatio), 
                  height: getContainerHeight(aspectRatio)
                }}
              >
                {generatedFlyer && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    width: '100%', 
                    height: '100%',
                  }}>
                    <img 
                      ref={imageRef}
                      src={generatedFlyer.imageUrl} 
                      alt="Generated design" 
                      className="max-w-full max-h-full object-contain"
                      style={{ maxHeight: '85vh' }}
                    />
                  </div>
                )}
                
                {isGenerating && !showGenerationProgress && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MultiColorLoading className="w-full h-full" />
                  </div>
                )}
                
                {/* Generation progress visualization */}
                {isGenerating && showGenerationProgress && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-4/5 max-w-md space-y-4">
                      <h3 className="text-lg font-semibold text-white text-center mb-4">Generating Your Design</h3>
                      
                      {/* Progress bar */}
                      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-white/70 to-white/40 transition-all duration-300" 
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                      
                      {/* Current step text */}
                      <div className="text-center text-white/90 text-sm">
                        {progressSteps[Math.min(Math.floor(progressPercent / 20), 4)]}
                      </div>
                      
                      {/* Progress percentage */}
                      <div className="text-center text-white/80 text-xs">
                        {progressPercent}% Complete
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Aspect ratio label */}
                {!isGenerating && (
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white/80 text-[10px] px-2 py-1">
                    {aspectRatioOptions.find(o => o.id === aspectRatio)?.label || aspectRatio}
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress steps at the bottom */}
            {isGenerating && showGenerationProgress && (
              <div className="p-4 bg-black/30 backdrop-blur-md rounded-md mx-auto mb-4 max-w-2xl">
                <h4 className="text-xs font-medium text-white/90 mb-2">Design Generation Process</h4>
                <div className="flex justify-between gap-2">
                  {progressSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`flex flex-col items-center ${Math.floor(progressPercent / 20) >= index ? 'text-white/90' : 'text-white/40'}`}
                    >
                      <div 
                        className={`w-3 h-3 rounded-full mb-1 ${Math.floor(progressPercent / 20) >= index ? 'bg-white' : 'bg-gray-600'}`}
                      ></div>
                      <span className="text-[10px] text-center max-w-[80px]">{step.split("...")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
