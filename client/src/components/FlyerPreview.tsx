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
};

export default function FlyerPreview({ 
  generatedFlyer, 
  isGenerating,
  aspectRatio: initialAspectRatio
}: FlyerPreviewProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>(initialAspectRatio || "profile");
  const [promptCopied, setPromptCopied] = useState(false);
  const [autoSaveAttempted, setAutoSaveAttempted] = useState(false);
  
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
  
  // Update aspectRatio when prop changes
  useEffect(() => {
    if (initialAspectRatio) {
      setAspectRatio(initialAspectRatio);
    }
  }, [initialAspectRatio]);
  
  // Speichern wir die letzte Bild-URL, um doppelte Speicherungen zu vermeiden
  const lastSavedImageUrlRef = useRef<string | null>(null);
  
  // Reset autoSaveAttempted when a new flyer is set with a different image URL
  useEffect(() => {
    // Wenn ein neuer Flyer gesetzt wird mit einer anderen URL als der zuletzt gespeicherten
    if (generatedFlyer && generatedFlyer.imageUrl !== lastSavedImageUrlRef.current) {
      setAutoSaveAttempted(false);
    }
  }, [generatedFlyer?.imageUrl]); // Nur zurücksetzen, wenn sich die Bild-URL ändert

  // Auto-save generated flyers to gallery when they appear
  useEffect(() => {
    const autoSaveFlyer = async () => {
      // Only try to auto-save if:
      // 1. We have a generated flyer
      // 2. We're not currently generating
      // 3. We haven't attempted to auto-save this flyer yet
      // 4. The user is authenticated
      // 5. This image URL hasn't been saved before
      const imageUrl = generatedFlyer?.imageUrl || null;
      if (
        generatedFlyer && 
        !isGenerating && 
        !autoSaveAttempted && 
        isAuthenticated && 
        imageUrl && 
        imageUrl !== lastSavedImageUrlRef.current
      ) {
        setAutoSaveAttempted(true);
        setIsSaving(true);
        
        try {
          // Speichern wir die URL für spätere Vergleiche
          lastSavedImageUrlRef.current = imageUrl;
          
          // Ein besserer, eindeutigerer Name für das Design
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
          
          // Keine Toast-Benachrichtigung mehr, um die Benutzeroberfläche sauberer zu halten
          console.log("Design successfully saved to gallery:", imageUrl.substring(0, 50) + "...");
        } catch (error) {
          console.error("Error auto-saving design:", error);
          // Don't show error notification for auto-save failures
        } finally {
          setIsSaving(false);
        }
      }
    };
    
    autoSaveFlyer();
  }, [generatedFlyer, isGenerating, autoSaveAttempted, isAuthenticated]);

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
      
      <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 flex-grow flex flex-col items-center justify-center relative w-full">
        {/* Dezentes Rastermuster als Hintergrund */}
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>
        {!generatedFlyer && !isGenerating ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div 
              className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900/20 to-purple-900/30 border border-indigo-500/20 rounded-md mx-auto"
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                padding: '2rem',
              }}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <img src={iconUpload} alt="Upload icon" className="h-20 w-20 mb-3" />
                <h3 className="text-base font-medium text-white/90">Your design will appear here</h3>
              </div>
              
              {/* Aspect ratio label for empty state */}
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white/80 text-[10px] px-2 py-1 rounded-md">
                {aspectRatioOptions.find(o => o.id === aspectRatio)?.label || aspectRatio}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col">
            <div className="flex-grow p-4 flex items-center justify-center">
              <div 
                className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-900/20 to-purple-900/30 border border-indigo-500/20 rounded-md mx-auto"
                style={{
                  maxWidth: '90%',
                  maxHeight: '90%',
                  padding: '2rem',
                }}
              >
                {generatedFlyer && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    width: '100%', 
                    height: '100%' 
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
                {isGenerating && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MultiColorLoading className="w-full h-full rounded-xl" />
                  </div>
                )}
                
                {/* Aspect ratio label */}
                {!isGenerating && (
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white/80 text-[10px] px-2 py-1 rounded-md">
                    {aspectRatioOptions.find(o => o.id === aspectRatio)?.label || aspectRatio}
                  </div>
                )}
              </div>
            </div>
            

          </div>
        )}
      </div>

    </div>
  );
}
