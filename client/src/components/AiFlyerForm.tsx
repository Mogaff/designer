import { useState, FormEvent, ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer, AiFlyerGenerationRequest } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, Upload, AlertTriangle } from "lucide-react";

type AiFlyerFormProps = {
  setGeneratedFlyer: (flyer: GeneratedFlyer | null) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
};

export default function AiFlyerForm({ 
  setGeneratedFlyer,
  isGenerating,
  setIsGenerating
}: AiFlyerFormProps) {
  const [prompt, setPrompt] = useState("");
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Suggestion categories with options for each
  const suggestions = {
    colors: [
      "vibrant neon colors",
      "elegant black and gold",
      "minimalist monochrome",
      "pastel gradient background",
      "bold primary colors",
      "muted earth tones",
      "retro color palette",
      "high contrast dark theme",
      "soft blue and white",
      "warm sunset gradient"
    ],
    layout: [
      "asymmetrical grid layout",
      "centered with large logo",
      "text columns with images",
      "split screen design",
      "minimalist white space",
      "3D layered elements",
      "diagonal text alignment",
      "circular centered design",
      "overlapping elements",
      "multi-panel comic style"
    ],
    typography: [
      "elegant serif typography",
      "bold sans-serif headlines",
      "handwritten script accents",
      "mixed font hierarchy",
      "large dramatic headlines",
      "thin minimalist typeface",
      "vintage typewriter font",
      "geometric modern fonts",
      "3D perspective text",
      "variable weight typography"
    ],
    effects: [
      "subtle drop shadows",
      "glass morphism effect",
      "paper texture overlay",
      "film grain texture",
      "neon glow highlights",
      "retro halftone pattern",
      "geometric shape backgrounds",
      "cut-out collage style",
      "double exposure effect",
      "watercolor brush elements"
    ]
  };

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
      
      const response = await apiRequest("POST", "/api/generate-ai", formData, {}, true);
      return response.blob();
    },
    onSuccess: (blob) => {
      const imageUrl = URL.createObjectURL(blob);
      setGeneratedFlyer({
        imageUrl,
        headline: "AI Generated Flyer",
        content: prompt,
        stylePrompt: prompt,
        template: "ai"
      });
      setIsGenerating(false);
      toast({
        title: "Success!",
        description: "Your AI flyer has been generated successfully.",
      });
    },
    onError: (error) => {
      setIsGenerating(false);
      
      // Get the error message
      let errorMessage = error instanceof Error ? error.message : "Failed to generate AI flyer";
      
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
      logo: logo || undefined
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
  
  // Function to add a suggestion to the prompt
  const addSuggestionToPrompt = (category: string) => {
    // Get a random suggestion from this category
    const suggestionsList = suggestions[category as keyof typeof suggestions];
    const randomIndex = Math.floor(Math.random() * suggestionsList.length);
    const suggestion = suggestionsList[randomIndex];
    
    // Add the suggestion to the prompt
    setPrompt(current => {
      const trimmedCurrent = current.trim();
      return trimmedCurrent 
        ? `${trimmedCurrent}, with ${suggestion}` 
        : `Create a flyer with ${suggestion}`;
    });
    
    // Show a toast notification
    toast({
      title: "Added to prompt",
      description: `Added "${suggestion}" to your prompt`,
      duration: 2000,
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-1">
        <h2 className="text-base font-semibold text-white">Create Flyer</h2>
      </div>
      
      <div className="flex items-center px-2 py-2 bg-orange-500/10 backdrop-blur-md text-white rounded-md border border-orange-300/10 mb-2">
        <AlertTriangle className="h-3 w-3 flex-shrink-0 mr-1 text-white" />
        <p className="text-xs">Include details about colors, layout, style, and content in your prompt.</p>
      </div>
      
      <p className="text-xs text-white/70 mb-3">
        Enter a detailed prompt and optionally upload background image and logo for your flyer.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-3 flex-grow flex flex-col">
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
            placeholder="Be specific! Example: 'Create a bold tech event flyer with minimalist layout. Event: FUTURE TECH 2025, March 15-17 at Innovation Center. Include AI workshops and VR experiences.'"
            className="block w-full resize-none bg-white/10 border-white/10 text-white placeholder:text-white/50 text-sm"
          />
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge 
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs py-0 cursor-pointer"
              onClick={() => addSuggestionToPrompt('colors')}
            >
              colors
            </Badge>
            <Badge 
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs py-0 cursor-pointer"
              onClick={() => addSuggestionToPrompt('layout')}
            >
              layout
            </Badge>
            <Badge 
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs py-0 cursor-pointer"
              onClick={() => addSuggestionToPrompt('typography')}
            >
              typography
            </Badge>
            <Badge 
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs py-0 cursor-pointer"
              onClick={() => addSuggestionToPrompt('effects')}
            >
              effects
            </Badge>
          </div>
        </div>
        
        <Separator className="bg-white/10 my-2" />
        
        {/* Image Upload Cards Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-white/80 mb-1 ml-1">Background</p>
            {/* Background Image Upload */}
            <div className="relative aspect-square overflow-hidden rounded-xl group transition-all duration-200 border border-gray-800/50 hover:border-indigo-500/50">
              {/* Ensuring all layers have the same rounded corners */}
              <div className="absolute inset-0 rounded-xl bg-[#1E1F2E] z-0"></div>
              
              {backgroundImagePreview ? (
                <div className="relative w-full h-full flex items-center justify-center z-10 rounded-xl overflow-hidden">
                  <img 
                    src={backgroundImagePreview} 
                    alt="Background Preview" 
                    className="max-h-full max-w-full object-contain"
                  />
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
                <div className="flex items-center justify-center h-full w-full relative z-10 rounded-xl">
                  <Input
                    id="background-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundImageChange}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    className="bg-[#383A62] text-white rounded-full w-32 h-8 text-sm hover:bg-[#4A4C7A] transition-colors"
                    onClick={() => document.getElementById('background-image-upload')?.click()}
                  >
                    Select Image
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <p className="text-xs text-white/80 mb-1 ml-1">Logo</p>
            {/* Logo Upload */}
            <div className="relative aspect-square overflow-hidden rounded-xl group transition-all duration-200 border border-gray-800/50 hover:border-indigo-500/50">
              {/* Ensuring all layers have the same rounded corners */}
              <div className="absolute inset-0 rounded-xl bg-[#1E1F2E] z-0"></div>
              
              {logoPreview ? (
                <div className="relative w-full h-full flex items-center justify-center z-10 rounded-xl overflow-hidden">
                  <img 
                    src={logoPreview} 
                    alt="Logo Preview" 
                    className="max-h-full max-w-full object-contain p-2" 
                  />
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
                <div className="flex items-center justify-center h-full w-full relative z-10 rounded-xl">
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    className="bg-[#383A62] text-white rounded-full w-32 h-8 text-sm hover:bg-[#4A4C7A] transition-colors"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    Select Logo
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Generate Button */}
        <Button
          type="submit"
          className="w-full font-medium rounded-md bg-indigo-500/40 backdrop-blur-sm text-white hover:bg-indigo-500/60 border-0 h-10 mt-auto"
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