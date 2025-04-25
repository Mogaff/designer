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
import backgroundGradient from "../assets/background-gradient.png";
import backgroundGradient2 from "../assets/backgroundd-gradient.png";
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
  selectedTemplate
}: AiFlyerFormProps) {
  const [prompt, setPrompt] = useState("");
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [designCount, setDesignCount] = useState<string>("4"); // Default to 4 designs
  const [generateAiBackground, setGenerateAiBackground] = useState<boolean>(false); // AI background generation toggle
  const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false);
  const [selectedPremiumOption, setSelectedPremiumOption] = useState<string | null>(null);
  const { fontSettings } = useUserSettings(); // Get font settings from context
  
  // Get active brand kit
  const { data: activeBrandKitData } = useQuery<{ brandKit: BrandKit }>({
    queryKey: ['/api/brand-kits/active'],
    refetchOnWindowFocus: false,
  });
  
  const activeBrandKit = activeBrandKitData?.brandKit;
  
  type AspectRatioOption = {
    id: string;
    label: string;
    value: string;
  };
  
  const aspectRatioOptions: AspectRatioOption[] = [
    // Square formats
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
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Set appropriate options when a template is selected
  useEffect(() => {
    if (selectedTemplate) {
      // Set a relevant aspect ratio for the template if needed
      if (selectedTemplate.category === "Social Media" || selectedTemplate.tags.includes("social")) {
        setAspectRatio("post"); // 1:1 for social posts
      } else if (selectedTemplate.category === "Banner" || selectedTemplate.tags.includes("banner")) {
        setAspectRatio("fb_cover"); // Wide format for banners
      }
      
      // Auto-select premium option if the template is premium
      if (selectedTemplate.isPremium) {
        setSelectedPremiumOption('premium');
      } else {
        setSelectedPremiumOption('basic');
      }
    }
  }, [selectedTemplate]);

  // Generate AI background image
  const generateAiBackgroundMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/generate-background", {
        prompt,
        imageSize: aspectRatio === "9/16" || aspectRatio === "2/3" ? "portrait_4_3" : 
                 aspectRatio === "1/1" ? "square" : "landscape_4_3"
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Set the background image preview with the generated image URL
      setBackgroundImagePreview(data.imageUrl);
      setBackgroundImage(null); // Clear any uploaded file
      
      toast({
        title: "Background Generated",
        description: "AI background image created successfully! (1 credit used)",
      });
    },
    onError: (error) => {
      console.error("Error generating AI background:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate AI background";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Generate AI flyer designs
  const generateAiFlyerMutation = useMutation({
    mutationFn: async (data: AiFlyerGenerationRequest) => {
      const formData = new FormData();
      formData.append("prompt", data.prompt);
      
      // If we have a background image file, use it
      if (data.backgroundImage) {
        formData.append("backgroundImage", data.backgroundImage);
      } 
      // If we have a background image preview URL from AI generation, include it
      else if (backgroundImagePreview && generateAiBackground) {
        formData.append("backgroundImageUrl", backgroundImagePreview || "");
      }
      
      if (data.logo) {
        formData.append("logo", data.logo);
      }
      
      if (data.designCount) {
        formData.append("designCount", data.designCount.toString());
      }
      
      if (data.aspectRatio) {
        formData.append("aspectRatio", data.aspectRatio);
      }
      
      // Add font settings to request
      if (data.fontSettings) {
        formData.append("headingFont", data.fontSettings.headingFont);
        formData.append("bodyFont", data.fontSettings.bodyFont);
      }
      
      // Add flag for AI background generation
      formData.append("generateAiBackground", generateAiBackground.toString());
      
      // Add template information if provided
      if (data.templateInfo) {
        formData.append("templateInfo", JSON.stringify(data.templateInfo));
      }
      
      const response = await apiRequest("POST", "/api/generate-ai", formData);
      return response.json();
    },
    onSuccess: (data: DesignSuggestions) => {
      // Store all designs in state for display
      setDesignSuggestions(data.designs);
      
      // Automatically select and display the first design
      if (data.designs && data.designs.length > 0) {
        const firstDesign = data.designs[0];
        setGeneratedFlyer({
          imageUrl: firstDesign.imageBase64,
          headline: "AI Generated Design",
          content: `Design style: ${firstDesign.style}`,
          stylePrompt: prompt, // Save the original prompt
          template: "ai"
        });
      } else {
        // Clear any existing design if no designs were generated
        setGeneratedFlyer(null);
      }
      
      setIsGenerating(false);
      
      // Refresh the gallery to show newly saved designs
      queryClient.invalidateQueries({ queryKey: ['/api/creations'] });
      
      // Show different messages based on how many designs were generated
      if (data.designs.length >= 4) {
        toast({
          title: "Success!",
          description: `Generated ${data.designs.length} design variations for you to choose from.`,
        });
      } else {
        toast({
          title: "Partial Success",
          description: `Generated ${data.designs.length} design variations. Some designs could not be generated due to API quota limits.`,
          duration: 5000,
        });
      }
    },
    onError: (error) => {
      setIsGenerating(false);
      setDesignSuggestions(null);
      
      // Get the error message
      let errorMessage = error instanceof Error ? error.message : "Failed to generate AI design";
      
      // Check if it's a quota limit error
      if (errorMessage.includes("API quota limit reached")) {
        toast({
          title: "API Quota Limit Reached",
          description: "The Gemini AI API free tier limit has been reached for today. Please try again tomorrow.",
          variant: "destructive",
          duration: 7000,
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  });

  const handleBackgroundImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.match('image.*')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setBackgroundImage(file);
      
      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.match('image.*')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setLogo(file);
      
      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a description for your flyer",
        variant: "destructive",
      });
      return;
    }

    // If no premium option is selected, show the dialog
    if (!selectedPremiumOption) {
      setIsPremiumDialogOpen(true);
      return;
    }
    
    // Use brand kit fonts if available, otherwise use user settings
    const fontsToUse: FontSettings = activeBrandKit 
      ? {
          headingFont: activeBrandKit.heading_font || fontSettings.headingFont,
          bodyFont: activeBrandKit.body_font || fontSettings.bodyFont
        }
      : fontSettings;
      
    // If using brand kit, add the brand colors to the prompt
    let enhancedPrompt = prompt;
    
    // Add quality instructions based on the premium option
    switch(selectedPremiumOption) {
      case 'premium':
        enhancedPrompt += " Create a high quality professional design with attention to detail.";
        break;
      case 'elite':
        enhancedPrompt += " Create a premium quality design with sophisticated styling and perfect proportions.";
        break;
      case 'ultimate':
        enhancedPrompt += " Create an ultra-high quality design with immaculate attention to detail, sophisticated styling and perfect balance.";
        break;
    }
    
    if (activeBrandKit) {
      enhancedPrompt += ` Use these brand colors: primary color ${activeBrandKit.primary_color}, secondary color ${activeBrandKit.secondary_color}, accent color ${activeBrandKit.accent_color}.`;
      
      // If brand voice is defined, also add that to the prompt
      if (activeBrandKit.brand_voice) {
        enhancedPrompt += ` Brand voice: ${activeBrandKit.brand_voice}.`;
      }
    }
    
    setIsGenerating(true);
    
    // Check if we need to generate a background image first
    if (generateAiBackground && !backgroundImagePreview) {
      // Generate a background image using the prompt
      const bgGenPrompt = `High quality background image for a flyer with the theme: ${prompt}`;
      
      toast({
        title: "Generating Background",
        description: "Creating AI background image first. This will use 1 additional credit.",
      });
      
      // First generate the background image, then the flyer
      generateAiBackgroundMutation.mutate(bgGenPrompt, {
        onSuccess: (data) => {
          // Once the background is generated, generate the flyer
          generateAiFlyerMutation.mutate({ 
            prompt: enhancedPrompt, 
            backgroundImage: backgroundImage || undefined,
            logo: logo || undefined,
            designCount: parseInt(designCount),
            aspectRatio,
            fontSettings: fontsToUse // Use brand kit fonts if active
          });
        },
        onError: (error) => {
          // If background generation fails, still try to generate the flyer without background
          toast({
            title: "Background generation failed",
            description: "Continuing with flyer generation without AI background.",
            variant: "destructive",
          });
          
          generateAiFlyerMutation.mutate({ 
            prompt: enhancedPrompt, 
            backgroundImage: backgroundImage || undefined,
            logo: logo || undefined,
            designCount: parseInt(designCount),
            aspectRatio,
            fontSettings: fontsToUse
          });
        }
      });
    } else {
      // No need to generate background image, directly generate the flyer
      // Prepare the request with template information if a template is selected
      const mutationData = { 
        prompt: enhancedPrompt, 
        backgroundImage: backgroundImage || undefined,
        logo: logo || undefined,
        designCount: parseInt(designCount),
        aspectRatio,
        fontSettings: fontsToUse, // Use brand kit fonts if active
        
        // Add template information if a template is selected
        templateInfo: selectedTemplate ? {
          name: selectedTemplate.name,
          category: selectedTemplate.category,
          tags: selectedTemplate.tags.join(', '),
          description: selectedTemplate.description,
          glassMorphism: selectedTemplate.styleData?.glassMorphism || false,
          neonEffects: selectedTemplate.styleData?.neonEffects || false
        } : undefined
      };
      
      generateAiFlyerMutation.mutate(mutationData);
    }
  };

  const clearBackgroundImage = () => {
    setBackgroundImage(null);
    setBackgroundImagePreview("");
  };
  
  const clearLogo = () => {
    setLogo(null);
    setLogoPreview("");
  };

  // When a premium option is selected
  const handleSelectPremiumOption = (optionId: string) => {
    setSelectedPremiumOption(optionId);
    
    if (optionId) {
      handleSubmit(new Event('submit') as any);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-2">
        <h2 className="text-base font-semibold text-white">Create Design</h2>
      </div>
      
      {/* Brand Kit Badge */}
      {activeBrandKit && !selectedTemplate && (
        <div className="mb-3 p-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 h-8 w-8 rounded bg-white/10 p-1 flex items-center justify-center overflow-hidden">
              {activeBrandKit.logo_url ? (
                <img src={activeBrandKit.logo_url} alt="Brand Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <PaintBucket className="h-4 w-4 text-indigo-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-white truncate">{activeBrandKit.name}</h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                  <Check className="mr-1 h-3 w-3" />
                  Active
                </span>
              </div>
              <p className="text-xs text-white/60 truncate">Using brand colors and typography</p>
            </div>
          </div>
        </div>
      )}
      
      <p className="text-xs text-white/70 mb-3">
        {selectedTemplate 
          ? "Using selected template with pre-defined style. Customize the prompt for your specific needs."
          : "Enter a detailed prompt and optionally upload background image and logo for your design."}
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-3 flex-grow flex flex-col">
        {/* Design prompt */}
        <div className="space-y-2">
          <Label htmlFor="prompt" className="text-xs font-medium text-white/70">
            Design Description
          </Label>
          <Textarea
            id="prompt"
            placeholder="Describe your design in detail... For example: A modern social media post for a coffee shop with a warm color palette, featuring a latte art image, and text that says 'Start your day right'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="h-28 resize-none bg-white/5 border-white/10 backdrop-blur-sm text-white placeholder:text-white/30"
            required
          />
        </div>

        {/* Design Settings - Background Image */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-white/70 flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            Background Image
          </Label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Background Image Uploader */}
            <div className="relative">
              <Input
                type="file"
                id="background-image"
                onChange={handleBackgroundImageChange}
                className="sr-only"
              />
              <Label
                htmlFor="background-image"
                className="cursor-pointer flex justify-center items-center h-16 rounded-md border border-dashed border-white/30 bg-white/5 hover:bg-white/10"
              >
                <div className="text-center">
                  <Upload className="mx-auto h-4 w-4 text-white/50" />
                  <span className="mt-1 block text-xs font-medium text-white/70">
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
                    className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full hover:bg-black/90"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-3 w-3" 
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
            
            {/* AI Background Generation Toggle */}
            <div className={`flex flex-col ${backgroundImage || backgroundImagePreview ? 'opacity-50 pointer-events-none' : ''}`}>
              <Label className="p-2 cursor-pointer flex items-center h-16 rounded-md border border-dashed border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20">
                <div className="flex-1 flex items-center gap-2">
                  <span className="mr-2">
                    <Checkbox 
                      id="generateAiBackground" 
                      checked={generateAiBackground}
                      onCheckedChange={(checked) => setGenerateAiBackground(!!checked)}
                      className="data-[state=checked]:bg-indigo-500"
                      disabled={!!(backgroundImage || backgroundImagePreview)}
                    />
                  </span>
                  <WandSparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <div className="text-xs text-white/90">
                    <span className="font-medium block">GENERATE WITH AI</span>
                    <span className="text-white/60 text-[10px]">Uses 1 extra credit</span>
                  </div>
                </div>
              </Label>
            </div>
          </div>
        </div>
        
        {/* Logo Upload */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-white/70 flex items-center gap-1">
            <TypeIcon className="h-3 w-3" />
            Logo
          </Label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Logo Uploader */}
            <div className="relative">
              <Input
                type="file"
                id="logo-upload"
                onChange={handleLogoChange}
                className="sr-only"
              />
              <Label
                htmlFor="logo-upload"
                className="cursor-pointer flex justify-center items-center h-16 rounded-md border border-dashed border-white/30 bg-white/5 hover:bg-white/10"
              >
                <div className="text-center">
                  <Upload className="mx-auto h-4 w-4 text-white/50" />
                  <span className="mt-1 block text-xs font-medium text-white/70">
                    Upload Logo
                  </span>
                </div>
              </Label>
              
              {/* Show logo preview */}
              {(logoPreview || logo) && (
                <div className="absolute inset-0 rounded-md overflow-hidden bg-white/5 flex items-center justify-center">
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="max-w-[80%] max-h-[80%] object-contain"
                  />
                  <button
                    type="button"
                    onClick={clearLogo}
                    className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full hover:bg-black/90"
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-3 w-3" 
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
            
            {/* Use logo from brand kit if available */}
            {activeBrandKit && activeBrandKit.logo_url && (
              <div className="relative">
                <div 
                  onClick={() => {
                    // Set the logo from brand kit
                    setLogoPreview(activeBrandKit.logo_url || "");
                    setLogo(null); // Clear any uploaded file
                  }}
                  className="cursor-pointer flex items-center h-16 rounded-md border border-dashed border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 p-2"
                >
                  <div className="flex-shrink-0 h-8 w-8 rounded bg-white/10 p-1 flex items-center justify-center overflow-hidden mr-2">
                    {activeBrandKit.logo_url ? (
                      <img src={activeBrandKit.logo_url} alt="Brand Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <PaintBucket className="h-4 w-4 text-indigo-400" />
                    )}
                  </div>
                  <p className="text-sm text-white/80">Using logo from Brand Kit: <span className="font-medium">{activeBrandKit.name}</span></p>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    className="mt-2 text-xs bg-white/10"
                    onClick={() => onOpenBrandKitPanel && onOpenBrandKitPanel()}
                  >
                    Edit Brand Kit
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Design Settings - Aspect Ratio and Fonts */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          {/* Premium Design Options Button */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-white/70 flex items-center gap-1">
              <Crown className="h-3 w-3 text-amber-400" />
              Design Quality
            </Label>
            <Button
              type="button"
              className="w-full bg-gradient-to-r from-indigo-500/40 to-purple-500/40 hover:from-indigo-500/60 hover:to-purple-500/60 backdrop-blur-sm border border-indigo-500/30 text-white"
              onClick={() => setIsPremiumDialogOpen(true)}
            >
              <Sparkles className="h-4 w-4 mr-2 text-amber-400" />
              {selectedPremiumOption ? `${selectedPremiumOption} Selected` : 'Choose Style'}
            </Button>
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
          />
          
          {/* Aspect Ratio Selector */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-white/70">
              Format / Aspect Ratio
            </Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Choose a size" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white">
                {aspectRatioOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mt-auto pt-2">
          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={isGenerating || (!prompt && !selectedTemplate)}
          >
            {isGenerating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                Generating Designs...
              </>
            ) : (
              <>Generate Designs</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}