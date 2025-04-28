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
      <div className="mb-4">
        <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30 backdrop-blur-md overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/10 to-indigo-600/10 opacity-50 group-hover:opacity-70 transition-opacity duration-700"></div>
          <div className="p-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-lg shadow-lg">
                <WandSparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">AI Design Studio</h2>
                <p className="text-xs text-white/70">Create stunning professional-grade designs</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        </div>
      </div>
      
      {/* Brand Kit Badge - More App Like */}
      {activeBrandKit && !selectedTemplate && (
        <div className="mb-4 rounded-xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20"></div>
          <div className="border border-indigo-500/30 p-3 backdrop-blur-md relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30 p-1.5 flex items-center justify-center overflow-hidden shadow-lg">
                {activeBrandKit.logo_url ? (
                  <img src={activeBrandKit.logo_url} alt="Brand Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <PaintBucket className="h-5 w-5 text-indigo-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-sm font-bold text-white truncate">{activeBrandKit.name}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-300 border border-green-500/30">
                    <Check className="mr-1 h-3 w-3" />
                    Active
                  </span>
                </div>
                <p className="text-xs text-white/60 truncate">Brand colors and typography applied automatically</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2 mb-4 backdrop-blur-sm">
        <p className="text-xs text-white/80 flex items-center">
          <Star className="h-3 w-3 text-amber-400 mr-1 flex-shrink-0" />
          {selectedTemplate 
            ? "Using premium template with professional styling. Add custom details in your prompt."
            : "Create a detailed prompt below and upload images for a stunning professional design."}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4 flex-grow flex flex-col">
        {/* Design prompt - Modern App Style */}
        <div className="space-y-2">
          <Label htmlFor="prompt" className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-1 rounded">
                <TypeIcon className="h-3 w-3" />
              </div>
              <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">Creative Brief</span>
            </div>
            <span className="text-[10px] text-white/50 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">AI-Enhanced</span>
          </Label>
          <div className="relative group rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 group-hover:from-indigo-500/10 group-hover:to-purple-500/10 transition-all duration-500 z-0"></div>
            <Textarea
              id="prompt"
              placeholder="Describe your design vision... For example: A modern social media post for a coffee shop with a warm color palette, featuring artisanal coffee imagery, and text that says 'Start your day right'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none bg-black/30 border-indigo-500/20 focus:border-indigo-500/50 backdrop-blur-sm text-white placeholder:text-white/40 rounded-xl shadow-lg relative z-10 transition-all duration-300"
              required
            />
          </div>
        </div>

        {/* Design Settings - Background Image - Modern App Style */}
        <div className="space-y-2">
          <Label className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-1 rounded">
                <ImageIcon className="h-3 w-3" />
              </div>
              <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">Background</span>
            </div>
          </Label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Background Image Uploader - Modern Style */}
            <div className="relative rounded-xl overflow-hidden shadow-lg group">
              <Input
                type="file"
                id="background-image"
                onChange={handleBackgroundImageChange}
                className="sr-only"
              />
              <Label
                htmlFor="background-image"
                className="cursor-pointer flex justify-center items-center h-20 rounded-xl border-0 relative overflow-hidden group-hover:shadow-indigo-500/20 group-hover:shadow-lg transition-all duration-300"
              >
                {/* Background gradient with animation */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src={backgroundGradient} 
                    alt="" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70 backdrop-blur-[1px]"></div>
                </div>
                
                <div className="text-center relative z-10 transform transition-transform duration-300 group-hover:scale-105">
                  <div className="bg-white/10 backdrop-blur-md p-2 rounded-full mb-1 inline-block">
                    <Upload className="mx-auto h-5 w-5 text-white" />
                  </div>
                  <span className="block text-xs font-bold text-white tracking-wide">
                    UPLOAD IMAGE
                  </span>
                  <span className="text-[10px] text-white/70 mt-1">Drop your image or click to browse</span>
                </div>
              </Label>
              
              {/* Show background image preview with modern styling */}
              {(backgroundImagePreview || backgroundImage) && (
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                  <img 
                    src={backgroundImagePreview} 
                    alt="Background preview" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/90 font-medium">Background Selected</span>
                      <button
                        type="button"
                        onClick={clearBackgroundImage}
                        className="bg-white/20 text-white p-1 rounded-full hover:bg-white/30 transition-colors"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-3.5 w-3.5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* AI Background Generation - Modern Toggle Card */}
            <div className={`relative rounded-xl overflow-hidden ${backgroundImage || backgroundImagePreview ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10"></div>
              <Label className="cursor-pointer flex flex-col justify-center items-center h-20 relative z-10 rounded-xl border border-indigo-500/30 bg-black/20 hover:bg-black/30 backdrop-blur-md transition-all duration-300">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <div className="relative">
                    <Checkbox 
                      id="generateAiBackground" 
                      checked={generateAiBackground}
                      onCheckedChange={(checked) => setGenerateAiBackground(!!checked)}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-indigo-500 data-[state=checked]:to-purple-500 border-white/30 h-5 w-5"
                      disabled={!!(backgroundImage || backgroundImagePreview)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-1.5 rounded-full">
                      <WandSparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                      <span className="font-semibold block text-white text-xs">AI BACKGROUND</span>
                      <span className="text-white/60 text-[10px]">Uses 1 credit</span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-white/60 px-2 text-center">AI will generate a unique background based on your prompt</span>
              </Label>
            </div>
          </div>
        </div>
        
        {/* Logo Upload - Modern App Style */}
        <div className="space-y-2">
          <Label className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-1 rounded">
                <TypeIcon className="h-3 w-3" />
              </div>
              <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">Logo</span>
            </div>
          </Label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Logo Uploader - Modern Style */}
            <div className="relative rounded-xl overflow-hidden shadow-lg group">
              <Input
                type="file"
                id="logo-upload"
                onChange={handleLogoChange}
                className="sr-only"
              />
              <Label
                htmlFor="logo-upload"
                className="cursor-pointer flex justify-center items-center h-20 rounded-xl border-0 relative overflow-hidden group-hover:shadow-amber-500/20 group-hover:shadow-lg transition-all duration-300"
              >
                {/* Background gradient with animation */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src={backgroundGradient2} 
                    alt="" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70 backdrop-blur-[1px]"></div>
                </div>
                
                <div className="text-center relative z-10 transform transition-transform duration-300 group-hover:scale-105">
                  <div className="bg-white/10 backdrop-blur-md p-2 rounded-full mb-1 inline-block">
                    <Upload className="mx-auto h-5 w-5 text-white" />
                  </div>
                  <span className="block text-xs font-bold text-white tracking-wide">
                    UPLOAD LOGO
                  </span>
                  <span className="text-[10px] text-white/70 mt-1">Transparent PNG recommended</span>
                </div>
              </Label>
              
              {/* Show logo preview with modern styling */}
              {(logoPreview || logo) && (
                <div className="absolute inset-0 rounded-xl overflow-hidden bg-gradient-to-b from-white/5 to-black/50 flex items-center justify-center backdrop-blur-sm">
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="max-w-[70%] max-h-[70%] object-contain drop-shadow-lg"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1.5 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/90 font-medium">Logo Uploaded</span>
                      <button
                        type="button"
                        onClick={clearLogo}
                        className="bg-white/20 text-white p-1 rounded-full hover:bg-white/30 transition-colors"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-3.5 w-3.5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Use logo from brand kit if available - modern style */}
            {activeBrandKit && activeBrandKit.logo_url && (
              <div className="relative rounded-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10"></div>
                <div 
                  onClick={() => {
                    // Set the logo from brand kit
                    setLogoPreview(activeBrandKit.logo_url || "");
                    setLogo(null); // Clear any uploaded file
                  }}
                  className="cursor-pointer flex items-center h-20 rounded-xl border border-amber-500/30 bg-black/20 p-3 backdrop-blur-md relative z-10 transition-colors hover:bg-black/40"
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-1.5 flex items-center justify-center overflow-hidden mr-3 shadow-lg border border-amber-500/30">
                    {activeBrandKit.logo_url ? (
                      <img src={activeBrandKit.logo_url} alt="Brand Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <PaintBucket className="h-5 w-5 text-amber-400" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold text-white truncate">
                      Brand Kit: <span className="text-amber-300">{activeBrandKit.name}</span>
                    </p>
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm"
                      className="text-[10px] h-6 py-0 bg-white/5 border-amber-500/30 hover:bg-white/10 hover:text-amber-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBrandKitPanel && onOpenBrandKitPanel();
                      }}
                    >
                      <PaintBucket className="h-3 w-3 mr-1" /> Edit Brand Kit
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Design Settings - Aspect Ratio and Quality - Modern App Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
          {/* Premium Design Options Button - Enhanced App-like Look */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white p-1 rounded">
                  <Crown className="h-3 w-3" />
                </div>
                <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">Quality Tier</span>
              </div>
            </Label>
            <div className="relative rounded-xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 group-hover:opacity-75 transition-opacity duration-300"></div>
              <Button
                type="button"
                className="w-full h-16 relative z-10 bg-black/30 hover:bg-black/40 backdrop-blur-md border border-amber-500/30 text-white rounded-xl group-hover:shadow-lg group-hover:shadow-amber-500/20 transition-all duration-300"
                onClick={() => setIsPremiumDialogOpen(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-amber-500/5 to-orange-500/5 opacity-50 rounded-xl"></div>
                <div className="relative z-10 flex items-center justify-center gap-3">
                  <div className="bg-gradient-to-r from-yellow-500 to-amber-500 p-2 rounded-lg shadow-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="block text-xs uppercase font-bold tracking-wide">
                      {selectedPremiumOption ? selectedPremiumOption : 'Choose Quality Tier'}
                    </span>
                    <span className="text-[10px] text-white/60">
                      {selectedPremiumOption === 'basic' && 'Standard (1 design)'}
                      {selectedPremiumOption === 'premium' && 'Premium quality (4 designs)'}
                      {selectedPremiumOption === 'elite' && 'Elite quality (8 designs)'}
                      {selectedPremiumOption === 'ultimate' && 'Ultimate quality (16 designs)'}
                      {!selectedPremiumOption && 'Select your preferred quality level'}
                    </span>
                  </div>
                </div>
              </Button>
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
          />
          
          {/* Aspect Ratio Selector - Modern App Style */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-1 rounded">
                  <svg 
                    width="12" 
                    height="12" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="12" y1="3" x2="12" y2="21" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">Format</span>
              </div>
            </Label>
            <div className="relative rounded-xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 group-hover:opacity-75 transition-opacity duration-300"></div>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger className="w-full h-16 bg-black/30 border-emerald-500/30 text-white relative z-10 rounded-xl group-hover:border-emerald-500/50 group-hover:shadow-lg group-hover:shadow-emerald-500/20 transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <SelectValue placeholder="Select size format" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-900/95 backdrop-blur-md border-emerald-500/30 text-white rounded-lg shadow-lg">
                  <div className="grid grid-cols-1 gap-1 p-1">
                    {aspectRatioOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id} className="rounded hover:bg-emerald-500/20">
                        {option.label}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Generate Button - Modern Gradient Style */}
        <div className="mt-6 pt-4 relative">
          <div className="absolute inset-0 blur-lg bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 transform -translate-y-1/2 opacity-50"></div>
          <Button
            type="submit"
            className="w-full h-14 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-700 text-white rounded-xl relative shadow-xl shadow-indigo-500/20 border border-indigo-500/30"
            disabled={isGenerating || (!prompt && !selectedTemplate)}
          >
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-indigo-600/30 opacity-50"></div>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-indigo-400/0 via-indigo-400/70 to-indigo-400/0"></div>
            </div>
            <div className="relative z-10 flex items-center justify-center">
              {isGenerating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  <span className="text-base font-bold tracking-wide">Generating Your Designs...</span>
                </>
              ) : (
                <>
                  <WandSparkles className="mr-3 h-5 w-5" />
                  <span className="text-base font-bold tracking-wide">Generate AI Designs</span>
                </>
              )}
            </div>
          </Button>
        </div>
      </form>
    </div>
  );
}