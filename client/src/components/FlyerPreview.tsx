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
  
  // Funktionen zur Berechnung der Container-Dimensionen basierend auf dem Seitenverhältnis
  const getContainerWidth = (ratio: string): string => {
    // Verschiedene Breiten je nach Seitenverhältnis
    switch(ratio) {
      case 'profile':
      case 'post':
      case 'square_ad':
        return '400px'; // Quadratisch
      case 'fb_cover':
      case 'twitter_header':
      case 'linkedin_banner':
      case 'yt_thumbnail':
      case 'instream':
        return '600px'; // Landscape/Querformat
      case 'stories':
      case 'pinterest':
      case 'skyscraper':
        return '300px'; // Hochformat
      case 'leaderboard':
        return '500px'; // Spezielle Werbebanner
      default:
        return '400px'; // Standard
    }
  };

  const getContainerHeight = (ratio: string): string => {
    // Höhe basierend auf Seitenverhältnis
    switch(ratio) {
      case 'profile':
      case 'post':
      case 'square_ad':
        return '400px'; // Quadratisch 1:1
      case 'yt_thumbnail':
      case 'instream': 
        return '337px'; // 16:9 Verhältnis (600 × 9/16)
      case 'fb_cover':
      case 'twitter_header':
      case 'linkedin_banner':
        return '200px'; // Querformat Banner
      case 'stories':
      case 'pinterest':
        return '533px'; // Hochformat 9:16 oder 2:3
      case 'leaderboard':
        return '80px'; // Leaderboard 728×90
      case 'skyscraper':
        return '600px'; // Skyscraper 160×600
      default:
        return '400px'; // Standard
    }
  };
  
  // Update aspectRatio when prop changes
  useEffect(() => {
    if (initialAspectRatio) {
      setAspectRatio(initialAspectRatio);
    }
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
      
      // Simulate progress steps
      let step = 0;
      const interval = setInterval(() => {
        setProgressPercent((prev) => {
          const newValue = Math.min(prev + 5, 100);
          return newValue;
        });
        
        if (step < 4 && progressPercent > step * 25) {
          step++;
        }
        
        if (progressPercent >= 100) {
          clearInterval(interval);
        }
      }, 200);
      
      return () => {
        clearInterval(interval);
      };
    } else {
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
      <div className="mb-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-white">Preview</h2>
        </div>
        
        <div className="flex space-x-2">
          <Button
            className="bg-green-600/70 backdrop-blur-sm border-none text-white h-7 px-3 py-1 text-xs hover:bg-green-600/90"
            size="sm"
            onClick={saveDesignToGallery}
            disabled={!generatedFlyer || isSaving}
          >
            {isSaving ? (
              <span className="h-3 w-3 mr-1 animate-spin">⏳</span>
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            Save to Gallery
          </Button>
          
          <Button
            className="bg-indigo-500/20 backdrop-blur-sm border-none text-white h-7 px-3 py-1 text-xs hover:bg-indigo-500/30"
            size="sm"
            onClick={handleDownload}
            disabled={!generatedFlyer}
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
          
          <Button
            className="bg-indigo-500/20 backdrop-blur-sm border-none text-white h-7 px-3 py-1 text-xs hover:bg-indigo-500/30"
            size="sm"
            onClick={handleShare}
            disabled={!generatedFlyer}
          >
            <Share2 className="h-3 w-3 mr-1" />
            Share
          </Button>
        </div>
      </div>
      
      <div className="bg-black/40 backdrop-blur-md border border-white/10 flex-grow flex flex-col items-center justify-center relative w-full">
        {/* Dezentes Rastermuster als Hintergrund */}
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>
        {!generatedFlyer && !isGenerating ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div 
              className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900/20 to-purple-900/30 border border-indigo-500/20 mx-auto"
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                padding: '2rem',
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
            <div className="flex-grow p-4 flex items-center justify-center">
              <div 
                className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900/20 to-purple-900/30 border border-indigo-500/20 mx-auto"
                style={{
                  maxWidth: '90%',
                  maxHeight: '90%',
                  padding: '2rem',
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
                    // Das Seitenverhältnis wird direkt über das Container-Element gesteuert
                  }}>
                    <img 
                      ref={imageRef}
                      src={generatedFlyer.imageUrl} 
                      alt="Generated design" 
                      className="max-w-full max-h-full object-contain"
                      style={{ maxHeight: '65vh' }}
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
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300" 
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
            
            {/* Additional info section below the preview */}
            {isGenerating && showGenerationProgress && (
              <div className="p-4 bg-black/30 backdrop-blur-md rounded-md mt-2 mx-4 mb-4">
                <h4 className="text-xs font-medium text-white/90 mb-2">Design Generation Process</h4>
                <ul className="space-y-1 text-xs text-white/70">
                  {progressSteps.map((step, index) => (
                    <li 
                      key={index} 
                      className={`flex items-center gap-2 ${Math.floor(progressPercent / 20) >= index ? 'text-white/90' : 'text-white/40'}`}
                    >
                      <div 
                        className={`w-2 h-2 rounded-full ${Math.floor(progressPercent / 20) >= index ? 'bg-green-500' : 'bg-gray-600'}`}
                      ></div>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
