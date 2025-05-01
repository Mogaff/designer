import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer, AiFlyerGenerationRequest, DesignVariation, BrandKit, DesignTemplate } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { ImageIcon, Upload, TypeIcon, Check, PaintBucket, Crown, WandSparkles } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type AiFlyerFormProps = {
  setGeneratedFlyer: (flyer: GeneratedFlyer | null) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  setDesignSuggestions: (suggestions: DesignVariation[] | null) => void;
  aspectRatio: string;
  setAspectRatio: (aspectRatio: string) => void;
  onOpenBrandKitPanel?: () => void;
  selectedTemplate?: DesignTemplate;
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
}: AiFlyerFormProps) {
  const { toast } = useToast();
  
  // State for form inputs
  const [prompt, setPrompt] = useState<string>("");
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [generateAiBackground, setGenerateAiBackground] = useState<boolean>(false);
  
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
      // Using apiRequest with special handling for FormData
      const response = await apiRequest('POST', '/api/generate-ai', data as any, {}, true);
      // Parse the response to JSON before returning it
      return await response.json();
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
        data.designs.forEach((design, index) => {
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
  const handleBackgroundImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBackgroundImage(file);
      setBackgroundImagePreview(URL.createObjectURL(file));
      setGenerateAiBackground(false); // Disable AI background when user uploads an image
    }
  };
  
  // Clear background image
  const clearBackgroundImage = () => {
    setBackgroundImage(null);
    if (backgroundImagePreview) {
      URL.revokeObjectURL(backgroundImagePreview);
    }
    setBackgroundImagePreview("");
  };
  
  // Handle file changes (logo)
  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
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
    
    if (backgroundImage) {
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
          <Label htmlFor="prompt" className="text-[9px] text-white/70 flex items-center gap-1 mb-0.5">
            <TypeIcon className="h-2 w-2" />
            Creative Brief
          </Label>
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
              />
              <Label
                htmlFor="background-image"
                className="cursor-pointer flex flex-col justify-center items-center aspect-square w-full rounded-md border border-white/10 bg-white/10 backdrop-blur-md shadow-lg hover:bg-white/15 transition-colors"
              >
                <Upload className="h-4 w-4 text-white/80" />
                <span className="text-[7px] text-white/70 mt-1">IMAGE</span>
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
        
        {/* Settings Row */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Design Count Selection */}
          <div>
            <Label className="text-[9px] text-white/70 flex items-center gap-1 mb-0.5">
              <Crown className="h-2 w-2" />
              Anzahl Designs
            </Label>
            <Select value={designCount} onValueChange={setDesignCount}>
              <SelectTrigger className="h-6 bg-white/10 backdrop-blur-md shadow-lg border-white/10 text-white text-[8px] rounded-md">
                <SelectValue placeholder="Anzahl Designs" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white rounded-md">
                <SelectItem value="1">1 Design</SelectItem>
                <SelectItem value="2">2 Designs</SelectItem>
                <SelectItem value="3">3 Designs</SelectItem>
                <SelectItem value="4">4 Designs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Format */}
          <div>
            <Label className="text-[9px] text-white/70 flex items-center gap-1 mb-0.5">
              <ImageIcon className="h-2 w-2" />
              Format
            </Label>
            <Select 
              value={aspectRatio} 
              onValueChange={(newValue) => {
                console.log("AiFlyerFormCompact: Changing aspect ratio from", aspectRatio, "to", newValue);
                setAspectRatio(newValue);
              }}
            >
              <SelectTrigger className="h-6 bg-white/10 backdrop-blur-md shadow-lg border-white/10 text-white text-[8px] rounded-md">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white rounded-md max-h-[200px]">
                {aspectRatioOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id} className="text-[8px]">
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