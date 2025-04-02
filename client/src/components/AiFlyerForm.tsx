import { useState, FormEvent, ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer, AiFlyerGenerationRequest, DesignSuggestions, DesignVariation } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ImageIcon, Upload } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import backgroundGradient from "../assets/background-gradient.png";
import backgroundGradient2 from "../assets/backgroundd-gradient.png";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AiFlyerFormProps = {
  setGeneratedFlyer: (flyer: GeneratedFlyer | null) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  setDesignSuggestions: (suggestions: DesignVariation[] | null) => void;
  aspectRatio: string;
  setAspectRatio: (aspectRatio: string) => void;
};

export default function AiFlyerForm({ 
  setGeneratedFlyer,
  isGenerating,
  setIsGenerating,
  setDesignSuggestions,
  aspectRatio,
  setAspectRatio
}: AiFlyerFormProps) {
  const [prompt, setPrompt] = useState("");
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [designCount, setDesignCount] = useState<string>("4"); // Default to 4 designs
  
  type AspectRatioOption = {
    id: string;
    label: string;
    value: string;
  };
  
  const aspectRatioOptions: AspectRatioOption[] = [
    { id: "profile", label: "Profile (800×800)", value: "1/1" },
    { id: "banner", label: "Banner (2048×1152)", value: "16/9" },
    { id: "thumbnail", label: "Thumbnail (1280×720)", value: "16/9" },
    { id: "instream", label: "In-stream Ad (1920×1080)", value: "16/9" },
    { id: "stories", label: "Stories (1080×1920)", value: "9/16" }, 
    { id: "bumper", label: "Bumper Ad (300×60)", value: "5/1" },
  ];
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const generateAiFlyerMutation = useMutation({
    mutationFn: async (data: AiFlyerGenerationRequest) => {
      const formData = new FormData();
      formData.append("prompt", data.prompt);
      
      if (data.backgroundImage) {
        formData.append("backgroundImage", data.backgroundImage);
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

    setIsGenerating(true);
    generateAiFlyerMutation.mutate({ 
      prompt, 
      backgroundImage: backgroundImage || undefined,
      logo: logo || undefined,
      designCount: parseInt(designCount),
      aspectRatio
    });
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
              <div className="absolute inset-0 z-0">
                <img 
                  src={backgroundGradient} 
                  alt="" 
                  className="h-full w-full object-cover"
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
                <div className="flex items-center justify-center h-full w-full relative z-10 rounded-xl backdrop-blur-md">
                  <Input
                    id="background-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundImageChange}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    className="bg-indigo-500/30 backdrop-blur-md text-white rounded-full hover:bg-indigo-500/50 transition-all border border-indigo-500/40 shadow-lg"
                    onClick={() => document.getElementById('background-image-upload')?.click()}
                  >
                    {isMobile ? (
                      <Upload className="h-4 w-4" />
                    ) : (
                      <span className="px-4">Select Image</span>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <p className="text-xs text-white/80 mb-1 ml-1">Logo</p>
            {/* Logo Upload - Fixed size container */}
            <div className="relative w-full h-28 overflow-hidden rounded-xl group transition-all duration-300 border border-gray-800/50 hover:border-indigo-500/50 hover:shadow-md hover:shadow-indigo-500/20">
              {/* Background Gradient Image */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={backgroundGradient2} 
                  alt="" 
                  className="h-full w-full object-cover"
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
                <div className="flex items-center justify-center h-full w-full relative z-10 rounded-xl backdrop-blur-md">
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    className="bg-indigo-500/30 backdrop-blur-md text-white rounded-full hover:bg-indigo-500/50 transition-all border border-indigo-500/40 shadow-lg"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    {isMobile ? (
                      <Upload className="h-4 w-4" />
                    ) : (
                      <span className="px-4">Select Logo</span>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Design Settings - Count and Aspect Ratio */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          {/* Design Count Selector */}
          <div className="space-y-1">
            <Label htmlFor="designCount" className="text-xs font-medium text-white/70">
              Number of Designs
            </Label>
            
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setDesignCount(num.toString())}
                  className={`
                    h-8 w-8 rounded-md flex items-center justify-center transition-all duration-200
                    ${parseInt(designCount) === num 
                      ? 'bg-indigo-500/50 border-indigo-400/70 text-white backdrop-blur-md' 
                      : 'bg-white/10 border-gray-800/50 text-white/80 hover:bg-indigo-500/30 backdrop-blur-sm'}
                    border hover:border-indigo-500/40 focus:outline-none
                    active:scale-95
                  `}
                >
                  <span className={`text-sm font-medium ${parseInt(designCount) === num ? 'text-white' : 'text-white/90'}`}>{num}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Aspect Ratio Selector */}
          <div className="space-y-1">
            <Label htmlFor="aspectRatio" className="text-xs font-medium text-white/70">
              Aspect Ratio
            </Label>
            
            <div className="flex flex-wrap gap-2">
              {aspectRatioOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setAspectRatio(option.id)}
                  className={`
                    h-8 px-2 rounded-md flex items-center justify-center transition-all duration-200
                    ${aspectRatio === option.id
                      ? 'bg-indigo-500/50 border-indigo-400/70 text-white backdrop-blur-md' 
                      : 'bg-white/10 border-gray-800/50 text-white/80 hover:bg-indigo-500/30 backdrop-blur-sm'}
                    border hover:border-indigo-500/40 focus:outline-none
                    active:scale-95
                  `}
                >
                  <span className={`text-xs font-medium ${aspectRatio === option.id ? 'text-white' : 'text-white/90'}`}>
                    {option.label.split(' ')[0]}
                  </span>
                </button>
              ))}
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