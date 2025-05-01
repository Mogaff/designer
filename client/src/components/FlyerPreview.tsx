import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer, BrandKit } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Download, Share2, Ratio, Check, Copy, Palette, PaintBucket } from "lucide-react";
import { MultiColorLoading } from "@/components/ui/multi-color-loading";
import { useQuery } from "@tanstack/react-query";
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
  
  // Animation states
  const [aspectRatioChanged, setAspectRatioChanged] = useState(false);
  const prevAspectRatioRef = useRef<string>(aspectRatio);
  
  // Query for active brand kit to show indicator
  const { data: activeBrandKitData } = useQuery<{ brandKit: BrandKit }>({
    queryKey: ['/api/brand-kits/active'],
    enabled: isAuthenticated,
  });
  
  type AspectRatioOption = {
    id: string;
    label: string;
    value: string;
  };
  
  const aspectRatioOptions: AspectRatioOption[] = [
    // Square formats
    { id: "profile", label: "Instagram Profile (1080×1080)", value: "1/1" },
    { id: "post", label: "Social Media Post (1200×1200)", value: "1/1" },
    { id: "square", label: "Square (1:1)", value: "1/1" },
    
    // Portrait formats
    { id: "portrait", label: "Portrait (4:5)", value: "4/5" },
    { id: "stories", label: "Instagram Stories (1080×1920)", value: "9/16" },
    { id: "story", label: "Story (9:16)", value: "9/16" },
    { id: "a4portrait", label: "A4 Portrait", value: "210/297" },
    
    // Landscape formats
    { id: "landscape", label: "Landscape (16:9)", value: "16/9" },
    { id: "facebook", label: "FB Cover", value: "851/315" },
    { id: "fb_cover", label: "Facebook Cover (820×312)", value: "820/312" },
    { id: "twitter_header", label: "Twitter Header (1500×500)", value: "3/1" },
    { id: "yt_thumbnail", label: "YouTube Thumbnail (1280×720)", value: "16/9" },
    { id: "linkedin_banner", label: "LinkedIn Banner (1584×396)", value: "4/1" },
    { id: "a4landscape", label: "A4 Landscape", value: "297/210" },
    
    // Video/Ad formats
    { id: "instream", label: "Video Ad (1920×1080)", value: "16/9" },
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
    console.log(`Calculating dimensions for aspect ratio: ${ratio}`);
    const ratioValue = getAspectRatioValue(ratio);
    console.log(`Aspect ratio value from lookup: ${ratioValue}`);
    
    let [width, height] = ratioValue.split('/').map(Number);
    console.log(`Raw width/height parsed: ${width}, ${height}`);
    
    // Ensure values are valid numbers
    if (!width || !height) {
      width = 1;
      height = 1;
      console.log(`Invalid width/height, defaulting to 1:1`);
    }
    
    // Base size for different aspect ratio categories - INCREASED MAY 1, 2025
    let baseSize = 800; // Default base size - INCREASED FROM 500
    
    // Adjust the base size for extreme aspect ratios
    if (ratio === 'leaderboard') {
      baseSize = 1200; // Special case for leaderboard ad - INCREASED FROM 728
      console.log(`Using leaderboard special case, baseSize: ${baseSize}`);
    } else if (width/height >= 3) {
      baseSize = 1300; // Extra wide formats (banners) - INCREASED FROM 800
      console.log(`Using extra wide format, baseSize: ${baseSize}`);
    } else if (height/width >= 3) {
      baseSize = 600; // Extra tall formats (skyscraper) - INCREASED FROM 350
      console.log(`Using extra tall format, baseSize: ${baseSize}`);
    } else if (width/height > 1.2) {
      baseSize = 1000; // Landscape formats - INCREASED FROM 600
      console.log(`Using landscape format, baseSize: ${baseSize}`);
    } else if (height/width > 1.2) {
      baseSize = 800; // Portrait formats - INCREASED FROM 450
      console.log(`Using portrait format, baseSize: ${baseSize}`);
    } else {
      baseSize = 800; // Square-ish formats - INCREASED FROM 500
      console.log(`Using square format, baseSize: ${baseSize}`);
    }
    
    // Calculate dimensions while maintaining aspect ratio
    let calcWidth, calcHeight;
    
    if (width >= height) {
      // Landscape or square: fix width, calculate height
      calcWidth = baseSize;
      calcHeight = Math.round(baseSize * (height/width));
      console.log(`Landscape calculation: ${calcWidth}px × ${calcHeight}px`);
    } else {
      // Portrait: fix height, calculate width
      calcHeight = baseSize;
      calcWidth = Math.round(baseSize * (width/height));
      console.log(`Portrait calculation: ${calcWidth}px × ${calcHeight}px`);
    }
    
    console.log(`Final dimensions for ${ratio}: ${calcWidth}px × ${calcHeight}px`);
    
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
    console.log("FlyerPreview: aspectRatio prop changed to:", initialAspectRatio);
    console.log("Previous local aspectRatio state was:", aspectRatio);
    
    // Force an update even if the value is the same (for debugging)
    setAspectRatio(prev => {
      const newValue = initialAspectRatio || "profile";
      console.log("Setting new aspectRatio state to:", newValue);
      
      // If the aspect ratio has changed, trigger animation
      if (prev !== newValue && prevAspectRatioRef.current !== newValue) {
        setAspectRatioChanged(true);
        // Reset animation state after a delay
        setTimeout(() => setAspectRatioChanged(false), 700);
      }
      
      // Update the ref
      prevAspectRatioRef.current = newValue;
      return newValue;
    });
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
          <div className="w-full h-full flex items-center justify-center">
            {/* Import the demo for the grid layout as a placeholder */}
            <div className="w-full h-full relative overflow-hidden">
              {/* Dynamic Aspect Ratio Display */}
              <div
                className="absolute bottom-4 right-4 z-50 bg-black/60 backdrop-blur-sm text-white/80 rounded-md overflow-hidden shadow-lg"
              >
                <div className="flex flex-col">
                  <div className="bg-indigo-500/30 px-2 py-0.5 text-[10px] font-medium">
                    {aspectRatioOptions.find(o => o.id === aspectRatio)?.label || aspectRatio}
                  </div>
                  <div className="px-2 py-0.5 text-[8px] text-white/60 flex items-center">
                    <span className="mr-1"><Ratio className="h-2 w-2" /></span>
                    <span>
                      {getContainerWidth(aspectRatio)} × {getContainerHeight(aspectRatio)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Simple animated grid layout for previews */}
              <div className="w-full h-full grid grid-cols-2 gap-4 p-4">
                {/* Selected format indicator text */}
                <div className="absolute top-2 left-2 z-50 bg-black/60 backdrop-blur-sm text-white/90 rounded-md px-2 py-1 text-xs">
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-400"></span>
                  {aspectRatioOptions.find(o => o.id === aspectRatio)?.label || "Custom Format"}
                </div>
                {/* Square Format preview */}
                <div 
                  className={`aspect-square overflow-hidden rounded-lg relative group cursor-pointer transform transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] ${['square', 'profile', 'post'].includes(aspectRatio) ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-black' : ''}`}
                  onClick={() => setAspectRatio('square')}
                >
                  <img 
                    src="https://images.unsplash.com/photo-1476231682828-37e571bc172f?q=80&w=1200&auto=format&fit=crop" 
                    alt="Square Format" 
                    className="object-cover w-full h-full transition-all duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4 opacity-80 group-hover:opacity-100 transition-opacity">
                    <p className="font-bold text-xl text-white mb-1">Square Format</p>
                    <p className="text-sm text-white/80">Perfect for social media posts and profile images</p>
                  </div>
                  <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">1:1</div>
                  {['square', 'profile', 'post'].includes(aspectRatio) && (
                    <div className="absolute top-3 left-3 bg-indigo-500 text-white rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                
                {/* Portrait Format preview */}
                <div 
                  className={`aspect-[3/4] overflow-hidden rounded-lg relative group cursor-pointer transform transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] ${['portrait', 'stories', 'story', 'a4portrait'].includes(aspectRatio) ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-black' : ''}`}
                  onClick={() => setAspectRatio('portrait')}
                >
                  <img 
                    src="https://images.unsplash.com/photo-1464457312035-3d7d0e0c058e?q=80&w=1200&auto=format&fit=crop" 
                    alt="Portrait Format" 
                    className="object-cover w-full h-full transition-all duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4 opacity-80 group-hover:opacity-100 transition-opacity">
                    <p className="font-bold text-xl text-white mb-1">Portrait Format</p>
                    <p className="text-sm text-white/80">Ideal for flyers, posters, and stories</p>
                  </div>
                  <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">3:4</div>
                  {['portrait', 'stories', 'story', 'a4portrait'].includes(aspectRatio) && (
                    <div className="absolute top-3 left-3 bg-indigo-500 text-white rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                
                {/* Landscape Format preview */}
                <div 
                  className={`aspect-video overflow-hidden rounded-lg relative group cursor-pointer transform transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] ${['landscape', 'instream', 'yt_thumbnail'].includes(aspectRatio) ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-black' : ''}`}
                  onClick={() => setAspectRatio('landscape')}
                >
                  <img 
                    src="https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?q=80&w=1200&auto=format&fit=crop" 
                    alt="Landscape Format" 
                    className="object-cover w-full h-full transition-all duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4 opacity-80 group-hover:opacity-100 transition-opacity">
                    <p className="font-bold text-xl text-white mb-1">Landscape Format</p>
                    <p className="text-sm text-white/80">Perfect for web banners and video thumbnails</p>
                  </div>
                  <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">16:9</div>
                  {['landscape', 'instream', 'yt_thumbnail'].includes(aspectRatio) && (
                    <div className="absolute top-3 left-3 bg-indigo-500 text-white rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                
                {/* Banner Format preview */}
                <div 
                  className={`aspect-[21/9] overflow-hidden rounded-lg relative group cursor-pointer transform transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] ${['fb_cover', 'facebook', 'twitter_header', 'linkedin_banner'].includes(aspectRatio) ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-black' : ''}`}
                  onClick={() => setAspectRatio('fb_cover')}
                >
                  <img 
                    src="https://images.unsplash.com/photo-1475070929565-c985b496cb9f?q=80&w=1200&auto=format&fit=crop" 
                    alt="Banner Format" 
                    className="object-cover w-full h-full transition-all duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4 opacity-80 group-hover:opacity-100 transition-opacity">
                    <p className="font-bold text-xl text-white mb-1">Banner Format</p>
                    <p className="text-sm text-white/80">Ideal for headers and media covers</p>
                  </div>
                  <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">21:9</div>
                  {['fb_cover', 'facebook', 'twitter_header', 'linkedin_banner'].includes(aspectRatio) && (
                    <div className="absolute top-3 left-3 bg-indigo-500 text-white rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
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
                  height: getContainerHeight(aspectRatio),
                  transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, transform 0.3s ease', 
                  boxShadow: aspectRatioChanged ? '0 0 30px rgba(255, 255, 255, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.25) inset' : '0 0 20px rgba(255, 255, 255, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.15) inset',
                  transform: aspectRatioChanged ? 'scale(1.02)' : 'scale(1)'
                }}
                data-aspect-ratio={aspectRatio} // Add data attribute for debugging
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
                
                {/* Enhanced aspect ratio label for generated content */}
                {!isGenerating && (
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white/80 rounded-md overflow-hidden">
                    <div className="flex flex-col">
                      <div className="bg-indigo-500/30 px-2 py-0.5 text-[10px] font-medium">
                        {aspectRatioOptions.find(o => o.id === aspectRatio)?.label || aspectRatio}
                      </div>
                      <div className="px-2 py-0.5 text-[8px] text-white/60 flex items-center">
                        <span className="mr-1"><Ratio className="h-2 w-2" /></span>
                        <span>
                          {getContainerWidth(aspectRatio)} × {getContainerHeight(aspectRatio)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Brand Kit Indicator - only show when active and not generating */}
                {!isGenerating && activeBrandKitData?.brandKit && (
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white/80 rounded-md overflow-hidden animate-fadeIn">
                    <div className="flex items-center px-2 py-1 gap-1">
                      <div className="h-4 w-4 rounded bg-white/15 p-0.5 flex items-center justify-center">
                        {activeBrandKitData.brandKit.logo_url ? (
                          <img 
                            src={activeBrandKitData.brandKit.logo_url} 
                            alt="Brand" 
                            className="max-h-full max-w-full object-contain" 
                          />
                        ) : (
                          <PaintBucket className="h-2.5 w-2.5 text-white/80" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-white/90">{activeBrandKitData.brandKit.name}</span>
                          <span className="inline-flex items-center px-1 py-0 rounded-sm text-[7px] bg-green-900/30 text-green-400">
                            <Check className="mr-0.5 h-1.5 w-1.5" />
                            Applied
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[7px] text-white/70">
                          <div 
                            className="h-2 w-2 rounded-full" 
                            style={{ backgroundColor: activeBrandKitData.brandKit.primary_color || '#ffffff' }}
                          ></div>
                          <div 
                            className="h-2 w-2 rounded-full" 
                            style={{ backgroundColor: activeBrandKitData.brandKit.secondary_color || '#cccccc' }}
                          ></div>
                        </div>
                      </div>
                    </div>
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
