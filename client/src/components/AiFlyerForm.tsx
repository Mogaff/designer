import { useState, FormEvent, ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
};

export default function AiFlyerForm({ 
  setGeneratedFlyer,
  isGenerating,
  setIsGenerating,
  setDesignSuggestions
}: AiFlyerFormProps) {
  const [prompt, setPrompt] = useState("");
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [designCount, setDesignCount] = useState<string>("4"); // Default to 4 designs
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
      
      const response = await apiRequest("POST", "/api/generate-ai", formData);
      return response.json();
    },
    onSuccess: (data: DesignSuggestions) => {
      // Clear any existing design
      setGeneratedFlyer(null);
      
      // Store all designs in state for display
      setDesignSuggestions(data.designs);
      
      setIsGenerating(false);
      
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
      designCount: parseInt(designCount)
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
        
        {/* Prompt Input */}
        <div className="space-y-1">
          <Label htmlFor="prompt" className="text-sm font-medium text-white/90">
            Prompt
          </Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Be specific! Example: 'Create a bold tech event design with minimalist layout. Event: FUTURE TECH 2025, March 15-17 at Innovation Center. Include AI workshops and VR experiences.'"
            className="block w-full resize-none bg-white/10 border-white/10 text-white placeholder:text-white/50 text-sm"
          />
        </div>
        
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
          
          <p className="text-xs text-white/50 mt-1">
            Number of variations to generate
          </p>
        </div>
        
        {/* Generate Button */}
        <Button
          type="submit"
          className="w-full font-medium rounded-md bg-indigo-500/40 backdrop-blur-md text-white hover:bg-indigo-500/60 border border-indigo-500/40 shadow-lg transition-all h-10 mt-auto"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <span>Creating Design...</span>
              <div className="ml-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            </>
          ) : (
            <span>Generate Design</span>
          )}
        </Button>
      </form>
    </div>
  );
}