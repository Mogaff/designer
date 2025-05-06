import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer, AiFlyerGenerationRequest, DesignVariation, BrandKit, DesignTemplate } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { ImageIcon, Upload, TypeIcon, Check, PaintBucket, Crown, WandSparkles, Lightbulb } from "lucide-react";
import CompetitorInspirationPanel from "@/components/CompetitorInspirationPanel";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

// Helper function to compress and resize images before upload
const compressImage = async (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * maxWidth / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(width * maxHeight / height);
            height = maxHeight;
          }
        }
        
        // Create canvas and context
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        // Draw image to canvas with new dimensions
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get data URL and convert back to File
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Canvas to Blob conversion failed"));
            return;
          }
          
          // Create new file from blob
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = (error) => {
        reject(error);
      };
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
};

type AiFlyerFormProps = {
  setGeneratedFlyer: (flyer: GeneratedFlyer | null) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  setDesignSuggestions: (suggestions: DesignVariation[] | null) => void;
  aspectRatio: string;
  setAspectRatio: (aspectRatio: string) => void;
  onOpenBrandKitPanel?: () => void;
  selectedTemplate?: DesignTemplate;
  setIsCarouselView?: (isCarousel: boolean) => void;
};

export default function AiFlyerFormCompact({ 
  setGeneratedFlyer,
  isGenerating,
  setIsGenerating,
  setDesignSuggestions,
  aspectRatio,
  setAspectRatio,
  onOpenBrandKitPanel,
  selectedTemplate,
  setIsCarouselView,
}: AiFlyerFormProps) {
  const { toast } = useToast();
  
  // State for form inputs
  const [prompt, setPrompt] = useState<string>("");
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [generateAiBackground, setGenerateAiBackground] = useState<boolean>(false);
  const [isInspirationPanelOpen, setIsInspirationPanelOpen] = useState<boolean>(false);
  const [createCarousel, setCreateCarousel] = useState<boolean>(false);
  const [multipleImages, setMultipleImages] = useState<File[]>([]);
  const [multipleImagePreviews, setMultipleImagePreviews] = useState<string[]>([]);
  
  // State für die Anzahl der zu generierenden Designs
  const [designCount, setDesignCount] = useState<string>("4"); // Default ist jetzt 4 Designs
  
  // Aspect ratio options for the dropdown
  const aspectRatioOptions = [
    { id: "square", label: "Square (1:1)", value: "1:1" },
    { id: "portrait", label: "Portrait (4:5)", value: "4:5" },
    { id: "landscape", label: "Landscape (16:9)", value: "16:9" },
    { id: "story", label: "Story (9:16)", value: "9:16" },
    { id: "facebook", label: "FB Cover", value: "851:315" },
    { id: "a4portrait", label: "A4 Portrait", value: "210:297" },
    { id: "a4landscape", label: "A4 Landscape", value: "297:210" }
  ];
  
  // Query for active brand kit
  const { data: activeBrandKitData } = useQuery<{ brandKit: BrandKit }>({
    queryKey: ['/api/brand-kits/active'],
    enabled: !selectedTemplate, // Only fetch if not using a template
  });
  
  const activeBrandKit = activeBrandKitData?.brandKit;
  
  // Mutation for generating AI flyer
  const aiGenerationMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // apiRequest already returns parsed JSON data, no need to call .json() again
      return await apiRequest('POST', '/api/generate-ai', data as any, {}, true);
    },
    onSuccess: (data: any) => {
      setIsGenerating(false);
      console.log("Server response:", data);
      // Enhanced debug logging
      console.log("Response structure:", {
        hasData: !!data,
        hasDesigns: !!(data && data.designs),
        designCount: data && data.designs ? data.designs.length : 0,
        firstDesign: data && data.designs && data.designs[0] ? {
          hasBase64: !!data.designs[0].imageBase64,
          base64Length: data.designs[0].imageBase64 ? data.designs[0].imageBase64.length : 0,
          style: data.designs[0].style
        } : null
      });
      
      if (data && data.designs && data.designs.length > 0) {
        // Log each design to make sure they have the expected structure
        data.designs.forEach((design: DesignVariation, index: number) => {
          console.log(`Design ${index + 1}:`, {
            id: design.id,
            hasBase64: !!design.imageBase64,
            base64Length: design.imageBase64 ? design.imageBase64.length : 0,
            style: design.style
          });
        });
        
        setDesignSuggestions(data.designs);
        // Show the first design suggestion immediately
        if (data.designs[0]) {
          // Create a GeneratedFlyer object with all required properties
          const firstDesign = data.designs[0];
          console.log("Setting first design:", firstDesign);
          setGeneratedFlyer({
            imageUrl: firstDesign.imageBase64 || "",
            headline: "AI Generated Design",
            content: `Design style: ${firstDesign.style || "Custom"}`,
            stylePrompt: firstDesign.style || prompt,
            template: "ai"
          });
        }
      } else {
        console.error("No designs found in response:", data);
        toast({
          title: "Error",
          description: "Failed to generate design suggestions. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setIsGenerating(false);
      toast({
        title: "Error",
        description: error.message || "Failed to generate flyer. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle file changes (background image)
  const handleBackgroundImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    // Reset previous images
    clearBackgroundImage();
    
    if (e.target.files && e.target.files.length > 0) {
      try {
        if (createCarousel && e.target.files.length > 1) {
          // Show loading toast
          toast({
            title: "Processing images",
            description: "Compressing multiple images for carousel..."
          });
          
          // Handle multiple files for carousel mode
          const files = Array.from(e.target.files);
          
          // Compress all files in parallel
          const compressedFiles = await Promise.all(
            files.map(file => compressImage(file, 1200, 1200, 0.7))
          );
          
          // Update state with compressed files
          setMultipleImages(compressedFiles);
          
          // Create previews for all images
          const previews = compressedFiles.map(file => URL.createObjectURL(file));
          setMultipleImagePreviews(previews);
          
          // Set the first image as the main image for backward compatibility
          setBackgroundImage(compressedFiles[0]);
          setBackgroundImagePreview(previews[0]);
          
          // Show success toast
          toast({
            title: "Images ready",
            description: `${compressedFiles.length} images prepared for carousel`,
          });
        } else {
          // Handle single file for normal mode
          const file = e.target.files[0];
          const compressedFile = await compressImage(file, 1200, 1200, 0.8);
          
          setBackgroundImage(compressedFile);
          setBackgroundImagePreview(URL.createObjectURL(compressedFile));
          
          // Clear multiple images if any
          setMultipleImages([]);
          setMultipleImagePreviews([]);
        }
        
        setGenerateAiBackground(false); // Disable AI background when user uploads an image
      } catch (error) {
        console.error("Error compressing images:", error);
        toast({
          title: "Error",
          description: "Failed to process image files. Please try again with smaller images.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Clear background image
  const clearBackgroundImage = () => {
    // Clear single image
    setBackgroundImage(null);
    if (backgroundImagePreview) {
      URL.revokeObjectURL(backgroundImagePreview);
    }
    setBackgroundImagePreview("");
    
    // Clear multiple images
    multipleImagePreviews.forEach(preview => {
      URL.revokeObjectURL(preview);
    });
    setMultipleImages([]);
    setMultipleImagePreviews([]);
  };
  
  // Handle file changes (logo)
  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const file = e.target.files[0];
        // Compress logo with higher quality but smaller dimensions
        const compressedFile = await compressImage(file, 800, 800, 0.9);
        
        setLogo(compressedFile);
        setLogoPreview(URL.createObjectURL(compressedFile));
      } catch (error) {
        console.error("Error compressing logo:", error);
        toast({
          title: "Error",
          description: "Failed to process logo. Please try again with a smaller image.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Clear logo
  const clearLogo = () => {
    setLogo(null);
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview("");
  };

  // Handle enhanced prompt from competitor inspiration
  const handleEnhancePrompt = (enhancedPrompt: string) => {
    setPrompt(enhancedPrompt);
    setIsInspirationPanelOpen(false);
    
    toast({
      title: "Prompt Enhanced",
      description: "Your prompt has been enhanced with competitor ad inspiration",
    });
  };
  
  // Handle form submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!prompt && !selectedTemplate) {
      toast({
        title: "Missing Input",
        description: "Please provide a prompt for your design.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    // Prepare form data for submission
    const formData = new FormData();
    formData.append("prompt", prompt);
    
    // If carousel mode is enabled and we have multiple images, append them all
    if (createCarousel && multipleImages.length > 0) {
      multipleImages.forEach(img => {
        formData.append("background_image", img);
      });
    } else if (backgroundImage) {
      // Otherwise just use the single background image
      formData.append("background_image", backgroundImage);
    }
    
    if (logo) {
      formData.append("logo", logo);
    }
    
    // If a template is selected, include its ID
    if (selectedTemplate) {
      formData.append("template_id", selectedTemplate.id.toString());
    }
    
    // Include aspect ratio (using camelCase to match server expectations)
    formData.append("aspectRatio", aspectRatio);
    
    // Include design count
    formData.append("design_count", designCount);
    
    // Include flag for AI background generation
    formData.append("generate_ai_background", generateAiBackground ? "true" : "false");
    
    // Include flag for creating carousel
    formData.append("create_carousel", createCarousel ? "true" : "false");
    
    // Update the isCarouselView state in the parent component if available
    if (setIsCarouselView) {
      setIsCarouselView(createCarousel);
    }
    
    // Include active brand kit ID if available
    if (activeBrandKit && !selectedTemplate) {
      formData.append("brand_kit_id", activeBrandKit.id.toString());
      
      // Include fonts from brand kit
      if (activeBrandKit.heading_font && activeBrandKit.body_font) {
        const fontsToUse = {
          headingFont: activeBrandKit.heading_font,
          bodyFont: activeBrandKit.body_font,
        };
        
        formData.append("fonts", JSON.stringify(fontsToUse));
      }
      
      // Include colors from brand kit
      if (activeBrandKit.primary_color && activeBrandKit.secondary_color) {
        const colorsToUse = {
          primary: activeBrandKit.primary_color || "#3B82F6",
          secondary: activeBrandKit.secondary_color || "#10B981",
        };
        
        formData.append("colors", JSON.stringify(colorsToUse));
      }
    }
    
    // Submit the form data
    aiGenerationMutation.mutate(formData);
  };
  
  // Use keyboard shortcut (Ctrl/Cmd + Enter) to submit the form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(new Event('submit') as any);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, backgroundImage, logo, aspectRatio, generateAiBackground, activeBrandKit]);

  return (
    <div className="h-full flex flex-col">
      {/* Header - Compact */}
      <div className="mb-1.5">
        <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-md p-1">
          <div className="flex items-center gap-1">
            <div className="bg-white/15 p-0.5 rounded">
              <WandSparkles className="h-3 w-3 text-white" />
            </div>
            <div>
              <h2 className="text-xs text-white">AI Design Studio</h2>
              <p className="text-[8px] text-white/70">Create designs</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Brand Kit Badge - Compact */}
      {activeBrandKit && !selectedTemplate && (
        <div className="mb-1.5">
          <div className="bg-white/10 backdrop-blur-md shadow-lg border border-white/10 p-1 rounded-md">
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 rounded bg-white/15 p-0.5 flex items-center justify-center">
                {activeBrandKit.logo_url ? (
                  <img src={activeBrandKit.logo_url} alt="Brand" className="max-h-full max-w-full object-contain" />
                ) : (
                  <PaintBucket className="h-2.5 w-2.5 text-white/80" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <h3 className="text-[9px] text-white">{activeBrandKit.name}</h3>
                  <span className="inline-flex items-center px-0.5 rounded-sm text-[7px] bg-green-900/30 text-green-400">
                    <Check className="mr-0.5 h-1.5 w-1.5" />
                    Active
                  </span>
                </div>
                <p className="text-[7px] text-white/70">Using brand colors</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-1.5 flex-grow flex flex-col">
        {/* Creative Brief */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <Label htmlFor="prompt" className="text-[9px] text-white/70 flex items-center gap-1">
              <TypeIcon className="h-2 w-2" />
              Creative Brief
            </Label>
            
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsInspirationPanelOpen(!isInspirationPanelOpen)}
              className="h-4 text-[8px] px-1.5 py-0 text-white/80 hover:text-white hover:bg-white/10 bg-white/5 backdrop-blur-md shadow-sm border border-white/10 rounded-full"
            >
              <Lightbulb className="h-2 w-2 mr-0.5" />
              {isInspirationPanelOpen ? "Hide inspiration" : "Get inspiration"}
            </Button>
          </div>
          
          {/* Competitor Inspiration Panel */}
          {isInspirationPanelOpen && (
            <div className="mb-1 p-1 rounded-md border border-white/10 bg-white/5 backdrop-blur-md shadow-sm">
              <CompetitorInspirationPanel 
                onEnhancePrompt={handleEnhancePrompt}
                originalPrompt={prompt}
                isOpen={isInspirationPanelOpen}
              />
            </div>
          )}
          
          <Textarea
            id="prompt"
            placeholder="Describe your design..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="h-12 resize-none bg-white/10 backdrop-blur-md shadow-lg border-white/10 text-white placeholder:text-white/40 rounded-md text-[9px]"
            required
          />
        </div>

        {/* Image Upload Row - 3 glass-blurry cube elements in a row */}
        <div className="grid grid-cols-3 gap-1">
          {/* Background Image */}
          <div>
            <div className="relative">
              <Input
                type="file"
                id="background-image"
                onChange={handleBackgroundImageChange}
                className="sr-only"
                multiple={createCarousel} // Allow multiple file selection when carousel mode is enabled
              />
              <Label
                htmlFor="background-image"
                className={`cursor-pointer flex flex-col justify-center items-center aspect-square w-full rounded-md border ${createCarousel ? 'border-indigo-400/30' : 'border-white/10'} bg-white/10 backdrop-blur-md shadow-lg hover:bg-white/15 transition-colors`}
              >
                <div className="relative">
                  <Upload className="h-4 w-4 text-white/80" />
                  {createCarousel && (
                    <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                    </span>
                  )}
                </div>
                <span className="text-[7px] text-white/70 mt-1">
                  {createCarousel ? 'IMAGES' : 'IMAGE'}
                </span>
                {createCarousel && (
                  <span className="text-[5px] text-indigo-400 mt-0.5">Multiple allowed</span>
                )}
              </Label>
              
              {(backgroundImagePreview || backgroundImage) && (
                <div className="absolute inset-0 rounded-md overflow-hidden">
                  <img 
                    src={backgroundImagePreview} 
                    alt="Background" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearBackgroundImage}
                    className="absolute top-0.5 right-0.5 bg-black/70 text-white p-0.5 rounded-full"
                  >
                    <svg width="6" height="6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 18L18 6M6 6l12 12" stroke="white" strokeWidth="2" />
                    </svg>
                  </button>
                  
                  {/* Show image count badge for carousel mode */}
                  {createCarousel && multipleImages.length > 1 && (
                    <div className="absolute bottom-0.5 left-0.5 bg-black/70 text-white px-1 py-0.5 rounded-sm text-[6px] flex items-center">
                      <span className="mr-0.5">{multipleImages.length}</span>
                      <svg width="6" height="6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 3H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18v14z" fill="white" />
                        <path d="M14 10.5V13c0 .6.4 1 1 1h2.5c.6 0 1-.4 1-1v-2.5c0-.6-.4-1-1-1H15c-.6 0-1 .4-1 1z" fill="white" />
                        <path d="M8 10.5V13c0 .6.4 1 1 1h2.5c.6 0 1-.4 1-1v-2.5c0-.6-.4-1-1-1H9c-.6 0-1 .4-1 1z" fill="white" />
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Logo Upload */}
          <div>
            <div className="relative">
              <Input
                type="file"
                id="logo-upload"
                onChange={handleLogoChange}
                className="sr-only"
              />
              <Label
                htmlFor="logo-upload"
                className="cursor-pointer flex flex-col justify-center items-center aspect-square w-full rounded-md border border-white/10 bg-white/10 backdrop-blur-md shadow-lg hover:bg-white/15 transition-colors"
              >
                <Upload className="h-4 w-4 text-white/80" />
                <span className="text-[7px] text-white/70 mt-1">LOGO</span>
              </Label>
              
              {(logoPreview || logo) && (
                <div className="absolute inset-0 rounded-md overflow-hidden bg-slate-800/80 backdrop-blur-sm flex items-center justify-center">
                  <img 
                    src={logoPreview} 
                    alt="Logo" 
                    className="max-w-[70%] max-h-[70%] object-contain"
                  />
                  <button
                    type="button"
                    onClick={clearLogo}
                    className="absolute top-0.5 right-0.5 bg-black/70 text-white p-0.5 rounded-full"
                  >
                    <svg width="6" height="6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 18L18 6M6 6l12 12" stroke="white" strokeWidth="2" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* AI Background Option */}
          <div className={`${backgroundImage || backgroundImagePreview ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="relative">
              <Label 
                className="flex flex-col items-center justify-center cursor-pointer aspect-square w-full rounded-md border border-white/10 bg-white/10 backdrop-blur-md shadow-lg hover:bg-white/15 transition-colors"
                onClick={() => setGenerateAiBackground(!generateAiBackground)}
              >
                <div className="relative">
                  <WandSparkles className="h-4 w-4 text-white/80" />
                  {generateAiBackground && (
                    <div className="absolute -top-1 -right-1 h-2 w-2 bg-emerald-500 rounded-full border border-white/20"></div>
                  )}
                </div>
                <span className="text-[7px] text-white/70 mt-1">AI BG</span>
              </Label>
            </div>
          </div>
          
          {/* Brand Kit Logo Option - Moved to quality/format row */}
          {/* Will be handled in the Settings Row */}
        </div>
        
        {/* Settings Row - Changed to flex-col for vertical stacking */}
        <div className="flex flex-col gap-1.5">
          {/* Design Count Selection */}
          <div>
            <Label className="text-[9px] text-white/70 flex items-center gap-1 mb-0.5">
              <Crown className="h-2 w-2" />
              Anzahl Designs
            </Label>
            {/* Modern design count slider */}
            <div className="space-y-2">
              <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-md border border-white/10 px-3 py-2.5">
                <Slider
                  value={[parseInt(designCount)]}
                  min={1}
                  max={4}
                  step={1}
                  onValueChange={(values) => {
                    setDesignCount(values[0].toString());
                  }}
                  className="mb-3 mt-1"
                />
                <div className="flex justify-between">
                  {[1, 2, 3, 4].map((num) => (
                    <div 
                      key={num}
                      className={`flex flex-col items-center cursor-pointer transition-all duration-150 ${
                        parseInt(designCount) === num 
                          ? 'scale-105' 
                          : 'opacity-60 hover:opacity-90'
                      }`}
                      onClick={() => setDesignCount(num.toString())}
                    >
                      <div 
                        className={`w-3.5 h-3.5 rounded-[1px] flex items-center justify-center text-[7px] font-medium ${
                          parseInt(designCount) === num 
                            ? 'bg-indigo-500 text-white shadow-sm' 
                            : 'bg-white/10 text-white/70 border border-white/10'
                        }`}
                      >
                        {num}
                      </div>
                      <span className="text-[6px] text-white/70 mt-0.5">
                        {num === 1 ? 'Design' : 'Designs'}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Carousel Toggle */}
                <div className="mt-3 border-t border-white/10 pt-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="carousel-toggle" className="text-[9px] text-white/80 flex items-center gap-1">
                      Create Carousel
                    </Label>
                    <Switch
                      id="carousel-toggle"
                      checked={createCarousel}
                      onCheckedChange={setCreateCarousel}
                    />
                  </div>
                  <p className="text-[7px] text-white/60 mt-0.5">
                    Generate designs with consistent style
                  </p>
                  
                  {/* Additional info for carousel mode */}
                  {createCarousel && (
                    <div className="mt-2 p-1.5 rounded-sm bg-indigo-900/20 border border-indigo-500/20">
                      <p className="text-[7px] text-indigo-300">
                        <span className="font-medium">Carousel Mode:</span> Select multiple images to create a series of designs with consistent style, colors, fonts, and layouts. The AI will maintain visual coherence across all designs in the carousel.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Format - Enhanced with Visual Aspect Ratio Gallery */}
          <div>
            <Label className="text-[9px] text-white/70 flex items-center gap-1 mb-0.5">
              <ImageIcon className="h-2 w-2" />
              Format
            </Label>
            
            {/* Visual Aspect Ratio Gallery */}
            <div className="mb-1.5 overflow-x-auto">
              <div className="flex gap-1.5 py-1">
                {/* Square Group */}
                <div className="border-l-2 border-blue-400/30 pl-1 flex gap-1.5">
                  {aspectRatioOptions.filter(o => o.id === 'square' || o.id === 'post' || o.id === 'profile')
                    .map(option => (
                      <button
                        key={option.id}
                        type="button"
                        className={`flex flex-col items-center group transition-all duration-200 ${
                          aspectRatio === option.id 
                            ? 'scale-110 opacity-100' 
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        onClick={() => {
                          console.log("AiFlyerFormCompact: Changing aspect ratio from", aspectRatio, "to", option.id);
                          setAspectRatio(option.id);
                        }}
                      >
                        <div 
                          className={`w-7 h-7 bg-white/5 border overflow-hidden flex items-center justify-center rounded-[1px] transition-all ${
                            aspectRatio === option.id 
                              ? 'border-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.2)]' 
                              : 'border-white/10 group-hover:border-blue-400/50'
                          }`}
                        >
                          <div className="w-5 h-5 bg-white/20 rounded-[1px]"></div>
                        </div>
                        <span className="text-[7px] mt-0.5 text-white/70 group-hover:text-white">
                          {option.id === 'square' ? '1:1' : option.id.charAt(0).toUpperCase() + option.id.slice(1)}
                        </span>
                      </button>
                    ))
                  }
                </div>
                
                {/* Landscape Group */}
                <div className="border-l-2 border-purple-400/30 pl-1 flex gap-1.5">
                  {aspectRatioOptions.filter(o => 
                      o.id === 'landscape' || o.id === 'facebook' || o.id === 'a4landscape'
                    ).map(option => (
                      <button
                        key={option.id}
                        type="button"
                        className={`flex flex-col items-center group transition-all duration-200 ${
                          aspectRatio === option.id 
                            ? 'scale-110 opacity-100' 
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        onClick={() => {
                          console.log("AiFlyerFormCompact: Changing aspect ratio from", aspectRatio, "to", option.id);
                          setAspectRatio(option.id);
                        }}
                      >
                        <div 
                          className={`w-10 h-6 bg-white/5 border overflow-hidden flex items-center justify-center rounded-[1px] transition-all ${
                            aspectRatio === option.id 
                              ? 'border-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.2)]' 
                              : 'border-white/10 group-hover:border-purple-400/50'
                          }`}
                        >
                          <div className="w-8 h-4 bg-white/20 rounded-[1px]"></div>
                        </div>
                        <span className="text-[7px] mt-0.5 text-white/70 group-hover:text-white">
                          {option.id === 'facebook' ? 'FB' : option.id === 'a4landscape' ? 'A4L' : '16:9'}
                        </span>
                      </button>
                    ))
                  }
                </div>
                
                {/* Portrait Group */}
                <div className="border-l-2 border-green-400/30 pl-1 flex gap-1.5">
                  {aspectRatioOptions.filter(o => 
                      o.id === 'portrait' || o.id === 'story' || o.id === 'a4portrait'
                    ).map(option => (
                      <button
                        key={option.id}
                        type="button"
                        className={`flex flex-col items-center group transition-all duration-200 ${
                          aspectRatio === option.id 
                            ? 'scale-110 opacity-100' 
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        onClick={() => {
                          console.log("AiFlyerFormCompact: Changing aspect ratio from", aspectRatio, "to", option.id);
                          setAspectRatio(option.id);
                        }}
                      >
                        <div 
                          className={`w-6 h-10 bg-white/5 border overflow-hidden flex items-center justify-center rounded-[1px] transition-all ${
                            aspectRatio === option.id 
                              ? 'border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.2)]' 
                              : 'border-white/10 group-hover:border-green-400/50'
                          }`}
                        >
                          <div className="w-4 h-8 bg-white/20 rounded-[1px]"></div>
                        </div>
                        <span className="text-[7px] mt-0.5 text-white/70 group-hover:text-white">
                          {option.id === 'story' ? 'Story' : option.id === 'a4portrait' ? 'A4P' : '4:5'}
                        </span>
                      </button>
                    ))
                  }
                </div>
              </div>
            </div>
            
            {/* Keep the original dropdown as well for advanced options */}
            <Select 
              value={aspectRatio} 
              onValueChange={(newValue) => {
                console.log("AiFlyerFormCompact: Changing aspect ratio from", aspectRatio, "to", newValue);
                setAspectRatio(newValue);
              }}
            >
              <div className="relative">
                <Label className="text-[9px] text-white/70 flex items-center gap-1 mb-0.5">
                  <ImageIcon className="h-2 w-2" />
                  More Formats
                </Label>
                <SelectTrigger className="h-6 bg-white/10 backdrop-blur-md shadow-lg border-white/10 text-white text-[8px] rounded-md">
                  <SelectValue />
                </SelectTrigger>
              </div>
              <SelectContent className="bg-white/10 backdrop-blur-md border-white/10 text-white rounded-md max-h-[200px]">
                <SelectItem value="custom" disabled className="text-[8px] font-medium text-white/70 bg-white/5">
                  All Formats
                </SelectItem>
                <SelectSeparator className="bg-white/10" />
                {aspectRatioOptions.map((option) => (
                  <SelectItem 
                    key={option.id} 
                    value={option.id} 
                    className="text-[8px] data-[highlighted]:bg-white/20 data-[highlighted]:text-white"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Premium feature not used anymore - removed dialog */}
        
        {/* Generate Button - Simplified */}
        <div className="mt-auto mb-0">
          <Button
            type="submit"
            className="w-full h-6 bg-white/10 backdrop-blur-md shadow-lg hover:bg-white/15 border-white/10 text-white rounded-md text-[9px] font-medium"
            disabled={isGenerating || (!prompt && !selectedTemplate)}
          >
            {isGenerating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-1.5 h-2.5 w-2.5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <WandSparkles className="mr-1 h-2 w-2" />
                <span>Generate AI Designs</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}