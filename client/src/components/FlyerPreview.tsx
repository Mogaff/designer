import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Download, Share2, Save, BookMarked, Ratio, Check, Copy } from "lucide-react";
import { MultiColorLoading } from "@/components/ui/multi-color-loading";
import iconUpload from "../assets/iconupload.png";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  const [isSaveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>(initialAspectRatio || "original");
  const [promptCopied, setPromptCopied] = useState(false);
  const [autoSaveAttempted, setAutoSaveAttempted] = useState(false);
  
  type AspectRatioOption = {
    id: string;
    label: string;
    value: string;
  };
  
  const aspectRatioOptions: AspectRatioOption[] = [
    { id: "original", label: "Original", value: "auto" },
    { id: "1:1", label: "Square (1:1)", value: "1/1" },
    { id: "4:3", label: "Standard (4:3)", value: "4/3" },
    { id: "16:9", label: "Widescreen (16:9)", value: "16/9" },
    { id: "9:16", label: "Portrait (9:16)", value: "9/16" },
    { id: "3:2", label: "Photo (3:2)", value: "3/2" },
    { id: "2:3", label: "Tall (2:3)", value: "2/3" },
  ];
  
  // Update aspectRatio when prop changes
  useEffect(() => {
    if (initialAspectRatio) {
      setAspectRatio(initialAspectRatio);
    }
  }, [initialAspectRatio]);
  
  // Auto-save generated flyers to gallery when they appear
  useEffect(() => {
    const autoSaveFlyer = async () => {
      // Only try to auto-save if:
      // 1. We have a generated flyer
      // 2. We're not currently generating
      // 3. We haven't attempted to auto-save this flyer yet
      // 4. The user is authenticated
      if (generatedFlyer && !isGenerating && !autoSaveAttempted && isAuthenticated) {
        setAutoSaveAttempted(true);
        setIsSaving(true);
        
        try {
          const designName = generatedFlyer.headline || `Design ${new Date().toLocaleDateString()}`;
          await apiRequest('POST', '/api/creations', {
            name: designName,
            imageUrl: generatedFlyer.imageUrl,
            headline: generatedFlyer.headline || null,
            content: generatedFlyer.content || null,
            stylePrompt: generatedFlyer.stylePrompt || null,
            template: generatedFlyer.template || null,
          });
          
          // Show a subtle toast notification
          toast({
            title: "Auto-saved",
            description: "Your design has been automatically saved to your gallery",
          });
        } catch (error) {
          console.error("Error auto-saving design:", error);
          // Don't show error notification for auto-save failures
        } finally {
          setIsSaving(false);
        }
      }
    };
    
    autoSaveFlyer();
  }, [generatedFlyer, isGenerating, autoSaveAttempted, isAuthenticated, toast]);

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
  
  const handleSaveToGallery = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to save designs to your gallery",
        variant: "destructive",
      });
      return;
    }
    
    if (!generatedFlyer) return;
    
    // Open save dialog with default name
    setSaveDialogName(`Design ${new Date().toLocaleDateString()}`);
    setSaveDialogOpen(true);
  };
  
  const saveDesignToGallery = async () => {
    if (!generatedFlyer || !saveDialogName.trim()) return;
    
    setIsSaving(true);
    
    try {
      await apiRequest('POST', '/api/creations', {
        name: saveDialogName.trim(),
        imageUrl: generatedFlyer.imageUrl,
        headline: generatedFlyer.headline || null,
        content: generatedFlyer.content || null,
        stylePrompt: generatedFlyer.stylePrompt || null,
        template: generatedFlyer.template || null,
      });
      
      toast({
        title: "Success",
        description: "Design saved to your gallery",
      });
      
      setSaveDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save design to gallery",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
          
          {/* Aspect Ratio Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 px-2 py-1 text-xs bg-black/30 border-gray-700 hover:bg-black/50 text-white"
              >
                <Ratio className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">{aspectRatioOptions.find(o => o.id === aspectRatio)?.label || "Original"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 bg-black/90 backdrop-blur-lg border border-gray-800 shadow-lg text-white">
              <DropdownMenuLabel className="text-xs text-gray-400">Aspect Ratio</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-800" />
              {aspectRatioOptions.map((option) => (
                <DropdownMenuItem 
                  key={option.id}
                  className="text-sm py-2 cursor-pointer focus:bg-gray-800 focus:text-white"
                  onClick={() => setAspectRatio(option.id)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{option.label}</span>
                    {aspectRatio === option.id && <Check className="h-4 w-4 text-indigo-400" />}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
          <Button
            className="bg-indigo-500/20 backdrop-blur-sm border-none text-white h-7 px-3 py-1 text-xs hover:bg-indigo-500/30"
            size="sm"
            onClick={handleSaveToGallery}
            disabled={!generatedFlyer}
          >
            <BookMarked className="h-3 w-3 mr-1" />
            Save to Gallery
          </Button>
        </div>
      </div>
      
      <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 flex-grow flex flex-col items-center justify-center">
        {!generatedFlyer && !isGenerating ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div 
              className={`relative flex items-center justify-center ${aspectRatio !== 'original' ? 'overflow-hidden' : ''} 
                ${aspectRatio !== 'original' ? 'bg-gradient-to-br from-indigo-900/20 to-purple-900/30 border border-indigo-500/20 rounded-md' : ''}`}
              style={{
                aspectRatio: aspectRatio === 'original' ? 'auto' : aspectRatioOptions.find(o => o.id === aspectRatio)?.value || 'auto',
                maxWidth: '100%',
                maxHeight: '100%',
                width: aspectRatio === 'original' ? 'auto' : '100%',
                height: aspectRatio === 'original' ? 'auto' : '100%',
              }}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <div className="glass-panel p-3 rounded-full mb-2">
                  <img src={iconUpload} alt="Upload icon" className="h-12 w-12" />
                </div>
                <h3 className="text-base font-medium text-white/90 mb-1">Your design will appear here</h3>
                <p className="text-xs text-white/60 max-w-xs">Fill out the form and click "Generate Design"</p>
              </div>
              
              {/* Aspect ratio label for empty state */}
              {aspectRatio !== 'original' && (
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white/80 text-[10px] px-2 py-1 rounded-md">
                  {aspectRatio}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col">
            <div className="flex-grow p-4 flex items-center justify-center">
              <div 
                className={`relative flex items-center justify-center ${aspectRatio !== 'original' ? 'overflow-hidden' : ''} 
                  ${aspectRatio !== 'original' ? 'bg-gradient-to-br from-indigo-900/20 to-purple-900/30 border border-indigo-500/20 rounded-md' : ''}`}
                style={{
                  aspectRatio: aspectRatio === 'original' ? 'auto' : aspectRatioOptions.find(o => o.id === aspectRatio)?.value || 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: aspectRatio === 'original' ? 'auto' : '100%',
                  height: aspectRatio === 'original' ? 'auto' : '100%',
                }}
              >
                {generatedFlyer && (
                  <img 
                    ref={imageRef}
                    src={generatedFlyer.imageUrl} 
                    alt="Generated design" 
                    className={`${aspectRatio === 'original' ? 'max-h-full max-w-full' : 'w-full h-full'} object-contain`}
                  />
                )}
                {isGenerating && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MultiColorLoading className="w-full h-full rounded-xl" />
                  </div>
                )}
                
                {/* Aspect ratio label */}
                {aspectRatio !== 'original' && !isGenerating && (
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white/80 text-[10px] px-2 py-1 rounded-md">
                    {aspectRatio}
                  </div>
                )}
              </div>
            </div>
            
            {/* Prompt display with copy button */}
            {generatedFlyer && generatedFlyer.stylePrompt && (
              <div className="p-3 border-t border-white/10 bg-black/30 backdrop-blur-sm rounded-b-xl">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-medium text-white/80">Prompt</h3>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={copyPromptToClipboard}
                          className="h-6 w-6 rounded-full hover:bg-white/10"
                        >
                          <Copy className="h-3.5 w-3.5 text-white/70" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">Copy prompt</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-white/60 line-clamp-2">{generatedFlyer.stylePrompt}</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Save to Gallery Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md bg-black/80 backdrop-blur-xl border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Save to Gallery</DialogTitle>
            <DialogDescription className="text-white/70">
              Give your design a name to save it to your gallery
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="design-name">Design Name</Label>
              <Input
                id="design-name"
                value={saveDialogName}
                onChange={(e) => setSaveDialogName(e.target.value)}
                className="bg-black/50 border-gray-700 text-white focus-visible:ring-indigo-500"
                placeholder="Enter a name for your design"
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              className="border-gray-700 text-white hover:bg-gray-900"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveDesignToGallery}
              disabled={isSaving || !saveDialogName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving ? "Saving..." : "Save to Gallery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
