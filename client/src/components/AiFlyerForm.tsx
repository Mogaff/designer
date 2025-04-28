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
import iconUpload from "../assets/iconupload.png";
import meshGradient from "../assets/image-mesh-gradient (18).png";
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
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
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
        formData.append("backgroundImageUrl", backgroundImagePreview);
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
      
      try {
        const response = await apiRequest("POST", "/api/generate-ai", formData);
        const data = await response.json();
        console.log("JSON data received:", JSON.stringify(data).substring(0, 200) + "...");
        
        // Workaround to check for empty object
        if (Object.keys(data).length === 0) {
          console.error("Empty response object received");
          throw new Error("Empty response received from server");
        }
        
        // Ensure designs property exists
        if (!data.designs || !Array.isArray(data.designs)) {
          console.error("No designs array in response:", data);
          throw new Error("Server response missing designs array");
        }
        
        return data;
      } catch (error) {
        console.error("Error parsing JSON response:", error);
        throw error;
      }
    },
    onSuccess: (data: DesignSuggestions) => {
      // Add debug logging to see what's coming back from the server
      console.log("Server response:", data);
      
      // Store all designs in state for display
      setDesignSuggestions(data.designs);
      
      // Automatically select and display the first design
      if (data.designs && data.designs.length > 0) {
        const firstDesign = data.designs[0];
        console.log("First design:", firstDesign);
        
        setGeneratedFlyer({
          imageUrl: firstDesign.imageBase64,
          headline: "AI Generated Design",
          content: `Design style: ${firstDesign.style}`,
          stylePrompt: prompt, // Save the original prompt
          template: "ai"
        });
      } else {
        // Clear any existing design if no designs were generated
        console.log("No designs returned from server");
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
      generateAiFlyerMutation.mutate({ 
        prompt: enhancedPrompt, 
        backgroundImage: backgroundImage || undefined,
        logo: logo || undefined,
        designCount: parseInt(designCount),
        aspectRatio,
        fontSettings: fontsToUse // Use brand kit fonts if active
      });
    }
  };

  const clearBackgroundImage = () => {
    setBackgroundImage(null);
    setBackgroundImagePreview(null);
  };
  
  const clearLogo = () => {
    setLogo(null);
    setLogoPreview(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-2">
        <h2 className="text-base font-semibold text-white">Create Design</h2>
      </div>
      
      {/* Brand Kit Badge */}
      {activeBrandKit && (
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
        Enter a detailed prompt and optionally upload background image and logo for your design.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-3 flex-grow flex flex-col">
        {/* Image Upload Cards Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-white/80 mb-1 ml-1">Background</p>
            {/* Background Image Upload - Fixed size container */}
            <div className="relative w-full h-28 overflow-hidden rounded-xl group transition-all duration-300 border border-gray-800/50 hover:border-indigo-500/50 hover:shadow-md hover:shadow-indigo-500/20">
              {/* Background Gradient Image */}
              <div className="absolute inset-0 z-0" style={{ overflow: 'hidden' }}>
                <img 
                  src={backgroundGradient} 
                  alt="" 
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              
              {backgroundImagePreview ? (
                <div className="relative w-full h-full flex items-center justify-center z-10 rounded-xl overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center">
                    <img 
                      src={backgroundImagePreview} 
                      alt="Background Preview" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-xl">
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm" 
                      onClick={clearBackgroundImage}
                      className="rounded-md h-7 text-xs px-3"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="flex items-center justify-center h-full w-full relative z-10 rounded-lg overflow-hidden"
                  style={{
                    backgroundImage: `url(${backgroundGradient})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="absolute inset-0 bg-black/20 z-0" />
                  <Input
                    id="background-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundImageChange}
                    className="hidden"
                  />
                  
                  <div className="z-10 flex flex-col items-center gap-1">
                    <Upload
                      className="h-6 w-6 mb-1 text-white opacity-80" 
                    />
                    <Button 
                      type="button" 
                      variant="ghost"
                      className="h-8 text-white hover:bg-white/10 rounded-md transition-all"
                      onClick={() => document.getElementById('background-image-upload')?.click()}
                    >
                      Upload Image
                    </Button>
                  </div>
                  
                  {/* AI Background Generation Option */}
                  <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/60 backdrop-blur-sm p-2">
                    <div className="flex items-center gap-1 justify-center">
                      <Checkbox 
                        id="generate-ai-bg" 
                        checked={generateAiBackground}
                        onCheckedChange={(checked) => setGenerateAiBackground(checked === true)}
                        className="w-3 h-3 rounded-sm data-[state=checked]:bg-indigo-500"
                      />
                      <label 
                        htmlFor="generate-ai-bg" 
                        className="text-[10px] text-white leading-tight cursor-pointer flex items-center"
                      >
                        <WandSparkles className="h-3 w-3 mr-0.5 text-indigo-300" />
                        GENERATE WITH AI (1 CREDIT)
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <p className="text-xs text-white/80 mb-1 ml-1">Logo</p>
            {/* Logo Upload - Only shown when no active brand kit */}
            {!activeBrandKit ? (
              <div className="relative w-full h-28 overflow-hidden rounded-xl group transition-all duration-300 border border-gray-800/50 hover:border-indigo-500/50 hover:shadow-md hover:shadow-indigo-500/20">
                {/* Background Gradient Image */}
                <div className="absolute inset-0 z-0" style={{ overflow: 'hidden' }}>
                  <img 
                    src={backgroundGradient2} 
                    alt="" 
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                
                {logoPreview ? (
                  <div className="relative w-full h-full flex items-center justify-center z-10 rounded-xl overflow-hidden">
                    <div className="p-2 flex items-center justify-center h-full w-full bg-white/5">
                      <img 
                        src={logoPreview} 
                        alt="Logo Preview" 
                        className="max-h-full max-w-full object-contain" 
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-xl">
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm" 
                        onClick={clearLogo}
                        className="rounded-md h-7 text-xs px-3"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="flex items-center justify-center h-full w-full relative z-10 rounded-lg overflow-hidden"
                    style={{
                      backgroundImage: `url(${backgroundGradient})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <div className="absolute inset-0 bg-black/20 z-0" />
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    
                    <div className="z-10 flex flex-col items-center gap-1">
                      <Upload
                        className="h-6 w-6 mb-1 text-white opacity-80" 
                      />
                      <Button 
                        type="button" 
                        variant="ghost"
                        className="h-8 text-white hover:bg-white/10 rounded-md transition-all"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                      >
                        Upload Logo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative w-full h-28 overflow-hidden rounded-xl group transition-all duration-300 border border-gray-800/50 bg-black/20" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)' }}>
                <div className="flex flex-col items-center justify-center h-full w-full text-center p-3">
                  <div className="w-12 h-12 rounded-md flex items-center justify-center overflow-hidden mb-2">
                    {activeBrandKit.logo_url ? (
                      <img src={activeBrandKit.logo_url} alt="Brand Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-indigo-500/30 flex items-center justify-center">
                        <PaintBucket className="h-6 w-6 text-indigo-300/80" />
                      </div>
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
                  setDesignCount('12');
                  break;
                default:
                  setDesignCount('4');
              }
            }}
            isGenerating={isGenerating}
          />
          
          {/* Font Selection - Only shown if no active Brand Kit */}
          {!activeBrandKit && (
            <div className="space-y-1">
              <Label htmlFor="fontSelection" className="text-xs font-medium text-white/70 flex items-center gap-1">
                <TypeIcon className="h-3 w-3 opacity-80" />
                Typography
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={fontSettings.headingFont}
                  onValueChange={(value) => {
                    const { setFontSettings } = useUserSettings();
                    setFontSettings({
                      ...fontSettings,
                      headingFont: value
                    });
                    // Preload the font
                    loadFont(value);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-white/10 border-white/10 text-white">
                    <SelectValue placeholder="Heading Font" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <div className="max-h-60 overflow-y-auto">
                      {['Roboto', 'Montserrat', 'Open Sans', 'Lato', 'Poppins', 'Oswald', 'Playfair Display', 'Raleway', 'Bebas Neue', 'Anton'].map((font) => (
                        <SelectItem key={font} value={font}>
                          <span style={{ fontFamily: font }}>{font}</span>
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
                
                <Select
                  value={fontSettings.bodyFont}
                  onValueChange={(value) => {
                    const { setFontSettings } = useUserSettings();
                    setFontSettings({
                      ...fontSettings,
                      bodyFont: value
                    });
                    // Preload the font
                    loadFont(value);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-white/10 border-white/10 text-white">
                    <SelectValue placeholder="Body Font" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <div className="max-h-60 overflow-y-auto">
                      {['Open Sans', 'Roboto', 'Lato', 'Nunito', 'Source Sans Pro', 'Montserrat', 'Raleway', 'PT Sans', 'Roboto Slab', 'Merriweather'].map((font) => (
                        <SelectItem key={font} value={font}>
                          <span style={{ fontFamily: font }}>{font}</span>
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* If Brand Kit is active, show what fonts are being used */}
          {activeBrandKit && (
            <div className="space-y-1">
              <Label className="text-xs font-medium text-white/70 flex items-center gap-1">
                <TypeIcon className="h-3 w-3 opacity-80" />
                Brand Typography
              </Label>
              <div className="bg-white/10 rounded-md p-2 border border-white/5 text-xs text-white/70">
                <div className="flex items-center gap-1 mb-1">
                  <span className="font-medium">Heading:</span>
                  <span style={{ fontFamily: (activeBrandKit.heading_font || 'inherit') as string }}>{activeBrandKit.heading_font || 'Default'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Body:</span>
                  <span style={{ fontFamily: (activeBrandKit.body_font || 'inherit') as string }}>{activeBrandKit.body_font || 'Default'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Second row with Aspect Ratio */}
        <div className="mb-3">
          {/* Aspect Ratio Selector with Dropdown Button and Button Grid */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="aspectRatio" className="text-xs font-medium text-white/70">
                Aspect Ratio
              </Label>
              
              <Select
                value={aspectRatio}
                onValueChange={setAspectRatio}
              >
                <SelectTrigger className="h-7 text-xs bg-indigo-500/40 border-indigo-500/30 text-white rounded-md w-auto px-3 shadow-sm">
                  <span className="flex items-center gap-1">
                    <span>Format:</span>
                    <span className="font-medium">
                      {aspectRatioOptions.find(option => option.id === aspectRatio)?.label.split(' ')[0] || 'Select'}
                    </span>
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <div className="max-h-60 overflow-y-auto">
                    {aspectRatioOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        <span className="text-sm">{option.label}</span>
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
            
            <div className="overflow-y-auto max-h-40 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pr-1">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {aspectRatioOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setAspectRatio(option.id)}
                    className={`
                      h-9 px-2 rounded-md flex flex-col items-center justify-center transition-all duration-200
                      ${aspectRatio === option.id
                        ? 'bg-indigo-500/50 border-indigo-400/70 text-white backdrop-blur-md' 
                        : 'bg-white/10 border-gray-800/50 text-white/80 hover:bg-indigo-500/30 backdrop-blur-sm'}
                      border hover:border-indigo-500/40 focus:outline-none
                      active:scale-95 w-full
                    `}
                  >
                    <span className={`text-[10px] font-medium ${aspectRatio === option.id ? 'text-white' : 'text-white/90'}`}>
                      {option.label.split(' ')[0]}
                    </span>
                    <span className={`text-[8px] ${aspectRatio === option.id ? 'text-white/90' : 'text-white/60'}`}>
                      {option.label.split('(')[1]?.split(')')[0] || ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Prompt Input with Generate Button */}
        <div className="space-y-1">
          <Label htmlFor="prompt" className="text-xs font-medium text-white/70">
            Prompt
          </Label>
          <div className="relative">
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Be specific! Example: 'Create a bold tech event design with minimalist layout. Event: FUTURE TECH 2025, March 15-17 at Innovation Center. Include AI workshops and VR experiences.'"
              className="block w-full resize-none bg-white/10 border-white/10 text-white placeholder:text-white/50 text-sm pr-24"
            />
            <Button
              type="submit"
              className="absolute bottom-3 right-3 px-3 py-1 h-8 text-xs font-medium rounded-md bg-indigo-500/40 backdrop-blur-md text-white hover:bg-indigo-500/60 border border-indigo-500/40 shadow-md transition-all"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span>Generating</span>
                  <div className="ml-1.5 h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                </>
              ) : (
                <span>Generate</span>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}