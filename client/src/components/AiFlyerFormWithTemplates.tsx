import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer, AiFlyerGenerationRequest, DesignSuggestions, DesignVariation, FontSettings, GoogleFont, BrandKit, DesignTemplate } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ImageIcon, Upload, TypeIcon, Check, PaintBucket, Crown, Sparkles, WandSparkles, Star } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import backgroundGradient from "@assets/image-mesh-gradient (11).png";
import backgroundGradient2 from "@assets/image-mesh-gradient (13).png";
import { useUserSettings } from "@/contexts/UserSettingsContext";
import { loadGoogleFonts, loadFont } from '@/lib/fontService';
import PremiumDesignPanel from "./PremiumDesignPanel";
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

export default function AiFlyerForm({ 
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
  const isMobile = useIsMobile();
  const { userSettings } = useUserSettings();
  
  // State for form inputs
  const [prompt, setPrompt] = useState<string>("");
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [generateAiBackground, setGenerateAiBackground] = useState<boolean>(false);
  
  // State for premium design options
  const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState<boolean>(false);
  const [selectedPremiumOption, setSelectedPremiumOption] = useState<string>("");
  const [designCount, setDesignCount] = useState<string>("1");
  
  // Aspect ratio options for the dropdown
  const aspectRatioOptions = [
    { id: "square", label: "Square - 1:1 (Instagram, Facebook)", value: "1:1" },
    { id: "portrait", label: "Portrait - 4:5 (Instagram)", value: "4:5" },
    { id: "landscape", label: "Landscape - 16:9 (YouTube, Twitter)", value: "16:9" },
    { id: "story", label: "Story - 9:16 (Instagram, TikTok)", value: "9:16" },
    { id: "facebook", label: "Facebook Cover - 851:315", value: "851:315" },
    { id: "a4portrait", label: "A4 Portrait - 210:297", value: "210:297" },
    { id: "a4landscape", label: "A4 Landscape - 297:210", value: "297:210" }
  ];
  
  // Query for active brand kit
  const { data: activeBrandKitData } = useQuery<{ brandKit: BrandKit }>({
    queryKey: ['/api/brand-kits/active'],
    enabled: !selectedTemplate, // Only fetch if not using a template
  });
  
  const activeBrandKit = activeBrandKitData?.brandKit;
  
  // Mutation for generating AI flyer
  const aiGenerationMutation = useMutation({
    mutationFn: async (data: AiFlyerGenerationRequest) => {
      return await apiRequest('POST', '/api/generate-ai', data, {}, true);
    },
    onSuccess: (data: any) => {
      setIsGenerating(false);
      console.log("Server response:", data);
      if (data.designs && data.designs.length > 0) {
        setDesignSuggestions(data.designs);
        // If we have the first design, set it immediately
        if (data.designs[0]) {
          setGeneratedFlyer({
            imageUrl: data.designs[0].imageBase64 || "",
            headline: "AI Generated Design",
            content: `Design style: ${data.designs[0].style || "Custom"}`,
            stylePrompt: data.designs[0].style || prompt,
            template: "ai",
            prompt: prompt,
          });
        }
      } else {
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
      const fontsToUse: FontSettings = activeBrandKit 
        ? {
            headingFont: activeBrandKit.heading_font as GoogleFont,
            bodyFont: activeBrandKit.body_font as GoogleFont,
            accentFont: activeBrandKit.accent_font as GoogleFont,
          }
        : {
            headingFont: "Inter" as GoogleFont,
            bodyFont: "Inter" as GoogleFont,
            accentFont: "Inter" as GoogleFont,
          };
      
      formData.append("fonts", JSON.stringify(fontsToUse));
      
      // Include colors from brand kit
      const colorsToUse = activeBrandKit
        ? {
            primary: activeBrandKit.primary_color || "#3B82F6",
            secondary: activeBrandKit.secondary_color || "#10B981",
            accent: activeBrandKit.accent_color || "#8B5CF6",
            background: activeBrandKit.background_color || "#1F2937",
            text: activeBrandKit.text_color || "#F9FAFB",
          }
        : {
            primary: "#3B82F6",
            secondary: "#10B981",
            accent: "#8B5CF6",
            background: "#1F2937",
            text: "#F9FAFB",
          };
      
      formData.append("colors", JSON.stringify(colorsToUse));
    }
    
    // Submit the form data
    aiGenerationMutation.mutate(formData as any);
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
  
  // Function to handle keyboard shortcuts
  const handleCommandK = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      handleSubmit(new Event('submit') as any);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-2">
        <div className="bg-slate-800 rounded-md overflow-hidden p-1.5">
          <div className="flex items-center gap-1.5">
            <div className="bg-slate-700 p-0.5 rounded">
              <WandSparkles className="h-3 w-3 text-white" />
            </div>
            <div>
              <h2 className="text-xs font-medium text-white">AI Design Studio</h2>
              <p className="text-[9px] text-white/70">Create professional designs</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Brand Kit Badge - Compact */}
      {activeBrandKit && !selectedTemplate && (
        <div className="mb-2 rounded-md overflow-hidden">
          <div className="bg-slate-800 border border-slate-700 p-1 relative z-10">
            <div className="flex items-center gap-1.5">
              <div className="flex-shrink-0 h-4 w-4 rounded bg-slate-700 p-0.5 flex items-center justify-center overflow-hidden">
                {activeBrandKit.logo_url ? (
                  <img src={activeBrandKit.logo_url} alt="Brand Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <PaintBucket className="h-2.5 w-2.5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <h3 className="text-[10px] text-white truncate">{activeBrandKit.name}</h3>
                  <span className="inline-flex items-center px-1 py-px rounded-full text-[8px] bg-green-900/30 text-green-400">
                    <Check className="mr-0.5 h-2 w-2" />
                    Active
                  </span>
                </div>
                <p className="text-[8px] text-white/60 truncate">Using brand colors</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <p className="text-[9px] text-white/70 mb-1">
        {selectedTemplate 
          ? "Using template with style. Add custom details in prompt."
          : "Create a prompt below and upload images for your design."}
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-1.5 flex-grow flex flex-col">
        {/* Design prompt - Simplified */}
        <div className="space-y-1">
          <Label htmlFor="prompt" className="text-[10px] font-medium text-white/70 flex items-center gap-1">
            <TypeIcon className="h-2 w-2" />
            Creative Brief
          </Label>
          <Textarea
            id="prompt"
            placeholder="Describe your design... (e.g., A modern social media post for a coffee shop with a warm color palette)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="h-16 resize-none bg-slate-800 border-slate-700 text-white placeholder:text-white/40 rounded-md text-[10px]"
            required
          />
        </div>

        {/* Image Upload Row */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Background Image */}
          <div>
            <Label htmlFor="background-image" className="text-[10px] text-white/70 flex items-center gap-1 mb-0.5">
              <ImageIcon className="h-2 w-2" />
              Background
            </Label>
            <div className="relative">
              <Input
                type="file"
                id="background-image"
                onChange={handleBackgroundImageChange}
                className="sr-only"
              />
              <Label
                htmlFor="background-image"
                className="cursor-pointer flex justify-center items-center h-10 rounded-md border border-slate-700 bg-slate-800 relative overflow-hidden"
              >
                <div className="text-center">
                  <Upload className="mx-auto h-2.5 w-2.5 text-white/70 mb-0.5" />
                  <span className="text-[9px] font-medium text-white/90">
                    Upload Image
                  </span>
                </div>
              </Label>
              
              {/* Show background image preview */}
              {(backgroundImagePreview || backgroundImage) && (
                <div className="absolute inset-0 rounded-md overflow-hidden">
                  <img 
                    src={backgroundImagePreview} 
                    alt="Background preview" 
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearBackgroundImage}
                    className="absolute top-0.5 right-0.5 bg-black/70 text-white p-0.5 rounded-full"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-2 w-2" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Logo Upload */}
          <div>
            <Label htmlFor="logo-upload" className="text-[10px] text-white/70 flex items-center gap-1 mb-0.5">
              <TypeIcon className="h-2 w-2" />
              Logo
            </Label>
            <div className="relative">
              <Input
                type="file"
                id="logo-upload"
                onChange={handleLogoChange}
                className="sr-only"
              />
              <Label
                htmlFor="logo-upload"
                className="cursor-pointer flex justify-center items-center h-10 rounded-md border border-slate-700 bg-slate-800 relative overflow-hidden"
              >
                <div className="text-center">
                  <Upload className="mx-auto h-2.5 w-2.5 text-white/70 mb-0.5" />
                  <span className="text-[9px] font-medium text-white/90">
                    Upload Logo
                  </span>
                </div>
              </Label>
              
              {/* Show logo preview */}
              {(logoPreview || logo) && (
                <div className="absolute inset-0 rounded-md overflow-hidden bg-slate-800/80 flex items-center justify-center">
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="max-w-[70%] max-h-[70%] object-contain"
                  />
                  <button
                    type="button"
                    onClick={clearLogo}
                    className="absolute top-0.5 right-0.5 bg-black/70 text-white p-0.5 rounded-full"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-2 w-2" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Options Row */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* AI Background Option */}
          <div className={`${backgroundImage || backgroundImagePreview ? 'opacity-50 pointer-events-none' : ''}`}>
            <Label className="flex items-center h-6 rounded-md border border-slate-700 bg-slate-800 p-1 cursor-pointer">
              <div className="flex items-center gap-1.5">
                <Checkbox 
                  id="generateAiBackground" 
                  checked={generateAiBackground}
                  onCheckedChange={(checked) => setGenerateAiBackground(!!checked)}
                  className="h-2.5 w-2.5 border-slate-600"
                  disabled={!!(backgroundImage || backgroundImagePreview)}
                />
                <div className="flex items-center gap-1">
                  <WandSparkles className="h-2.5 w-2.5 text-white/70" />
                  <span className="text-[9px] text-white/90">AI Background</span>
                </div>
              </div>
            </Label>
          </div>
          
          {/* Brand Kit Logo Option */}
          {activeBrandKit && activeBrandKit.logo_url && (
            <div 
              onClick={() => {
                setLogoPreview(activeBrandKit.logo_url || "");
                setLogo(null);
              }}
              className="cursor-pointer flex items-center h-6 rounded-md border border-slate-700 bg-slate-800 p-1"
            >
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-slate-700 flex items-center justify-center overflow-hidden">
                  {activeBrandKit.logo_url && (
                    <img src={activeBrandKit.logo_url} alt="Brand Logo" className="max-h-full max-w-full object-contain" />
                  )}
                </div>
                <span className="text-[9px] text-white/90">Use brand logo</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Settings Row */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Quality Tier */}
          <div>
            <Label className="text-[10px] text-white/70 flex items-center gap-1 mb-0.5">
              <Crown className="h-2 w-2" />
              Quality
            </Label>
            <Button
              type="button"
              className="w-full h-6 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-md px-2 text-[9px] justify-between"
              onClick={() => setIsPremiumDialogOpen(true)}
            >
              <span>{selectedPremiumOption || 'Choose Quality'}</span>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
          </div>
          
          {/* Format */}
          <div>
            <Label className="text-[10px] text-white/70 flex items-center gap-1 mb-0.5">
              <ImageIcon className="h-2 w-2" />
              Format
            </Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="h-6 bg-slate-800 border-slate-700 text-white text-[9px] rounded-md">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white rounded-md max-h-[200px]">
                {aspectRatioOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id} className="text-[9px]">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Premium Design Options Dialog */}
        <PremiumDesignPanel
          isOpen={isPremiumDialogOpen}
          onClose={() => setIsPremiumDialogOpen(false)}
          onSelectOption={(optionId) => {
            setSelectedPremiumOption(optionId);
            // Set the design count based on the option selected
            switch(optionId) {
              case 'basic':
                setDesignCount('1');
                break;
              case 'premium':
                setDesignCount('4');
                break;
              case 'elite':
                setDesignCount('8');
                break;
              case 'ultimate':
                setDesignCount('16');
                break;
            }
            setIsPremiumDialogOpen(false);
          }}
          isGenerating={isGenerating}
        />
        
        {/* Generate Button - Simplified */}
        <div className="mt-auto mb-0">
          <Button
            type="submit"
            className="w-full h-8 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[10px] font-medium"
            disabled={isGenerating || (!prompt && !selectedTemplate)}
          >
            {isGenerating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-3 w-3 text-white"
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
                <WandSparkles className="mr-1.5 h-2.5 w-2.5" />
                <span>Generate AI Designs</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}