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

  return (
    <div className="h-full flex flex-col">
      <div className="mb-2">
        <h2 className="text-base font-semibold text-white">Create Flyer</h2>
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
            <Badge className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs py-0">colors</Badge>
            <Badge className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs py-0">layout</Badge>
            <Badge className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs py-0">typography</Badge>
            <Badge className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs py-0">effects</Badge>
          </div>
        </div>
        
        <Separator className="bg-white/10 my-2" />
        
        {/* Background Image Upload */}
        <div className="mb-1.5">
          <div className="flex items-center mb-1">
            <ImageIcon className="h-3 w-3 mr-1 text-white/80" />
            <Label htmlFor="background-image-upload" className="text-sm font-medium text-white/90">
              Upload Background Image (Optional)
            </Label>
          </div>
          
          <div className="mt-1">
            {backgroundImagePreview ? (
              <div className="relative rounded-md overflow-hidden border border-white/20 glass-panel h-16">
                <img 
                  src={backgroundImagePreview} 
                  alt="Background Preview" 
                  className="w-full h-full object-cover" 
                />
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm" 
                  onClick={clearBackgroundImage}
                  className="absolute top-1 right-1 opacity-90 rounded-md h-6 text-xs px-2 py-0"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="border border-dashed border-white/20 rounded-md p-2 text-center bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center h-16">
                <div className="flex items-center">
                  <Upload className="h-4 w-4 text-white/40 mr-1.5" />
                  <p className="text-xs text-white/70 mr-2">
                    Select a background image
                  </p>
                  <Input
                    id="background-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundImageChange}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    className="bg-indigo-500/20 backdrop-blur-sm border-none text-white h-6 text-xs px-2 py-0 hover:bg-indigo-500/30"
                    size="sm"
                    onClick={() => document.getElementById('background-image-upload')?.click()}
                  >
                    Select Image
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Logo Upload */}
        <div className="mb-3">
          <div className="flex items-center mb-1">
            <ImageIcon className="h-3 w-3 mr-1 text-white/80" />
            <Label htmlFor="logo-upload" className="text-sm font-medium text-white/90">
              Upload Logo (Optional)
            </Label>
          </div>
          
          <div className="mt-1">
            {logoPreview ? (
              <div className="relative rounded-md overflow-hidden border border-white/20 glass-panel h-16">
                <div className="flex items-center justify-center bg-white/10 h-full p-2">
                  <img 
                    src={logoPreview} 
                    alt="Logo Preview" 
                    className="max-h-full max-w-full object-contain" 
                  />
                </div>
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm" 
                  onClick={clearLogo}
                  className="absolute top-1 right-1 opacity-90 rounded-md h-6 text-xs px-2 py-0"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="border border-dashed border-white/20 rounded-md p-2 text-center bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center h-16">
                <div className="flex items-center">
                  <Upload className="h-4 w-4 text-white/40 mr-1.5" />
                  <p className="text-xs text-white/70 mr-2">
                    Select your logo
                  </p>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    className="bg-indigo-500/20 backdrop-blur-sm border-none text-white h-6 text-xs px-2 py-0 hover:bg-indigo-500/30"
                    size="sm"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    Select Logo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center px-2 py-2 bg-gray-800/30 backdrop-blur-sm text-white rounded-md border border-white/10">
          <AlertTriangle className="h-3 w-3 flex-shrink-0 mr-1 text-white" />
          <p className="text-xs">Include details about colors, layout, style, and content in your prompt.</p>
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