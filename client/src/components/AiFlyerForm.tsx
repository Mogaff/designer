import { useState, FormEvent, ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, Upload, Sparkles, AlertTriangle } from "lucide-react";

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
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();

  const generateAiFlyerMutation = useMutation({
    mutationFn: async (data: { prompt: string; image?: File }) => {
      const formData = new FormData();
      formData.append("prompt", data.prompt);
      
      if (data.image) {
        formData.append("image", data.image);
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

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
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
      
      setImage(file);
      
      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
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
    generateAiFlyerMutation.mutate({ prompt, image: image || undefined });
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-2">
        <h2 className="text-base font-semibold text-white">Create Flyer</h2>
      </div>
      
      <p className="text-xs text-white/70 mb-3">
        Enter a detailed prompt and optionally upload an image for your flyer.
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
        
        {/* Image Upload - Optional */}
        <div className="flex-grow flex flex-col min-h-0">
          <div className="flex items-center mb-1">
            <ImageIcon className="h-3 w-3 mr-1 text-white/80" />
            <Label htmlFor="image-upload" className="text-sm font-medium text-white/90">
              Upload Image (Optional)
            </Label>
          </div>
          
          <div className="mt-1 flex-grow">
            {imagePreview ? (
              <div className="relative rounded-md overflow-hidden border border-white/20 glass-panel h-full max-h-32">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-full object-cover" 
                />
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm" 
                  onClick={clearImage}
                  className="absolute top-1 right-1 opacity-90 rounded-md h-6 text-xs px-2 py-0"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="border border-dashed border-white/20 rounded-md p-3 text-center bg-white/5 hover:bg-white/10 transition-all flex flex-col items-center justify-center h-full max-h-32">
                <Upload className="h-6 w-6 mx-auto text-white/40 mb-1" />
                <p className="text-xs text-white/70 mb-1">
                  Drag and drop an image, or click to select
                </p>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Button 
                  type="button" 
                  className="btn-secondary h-6 text-xs px-2 py-0"
                  size="sm"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  Select Image
                </Button>
                <p className="text-xs text-white/50 mt-1">
                  Max: 5MB
                </p>
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
          className="w-full font-medium rounded-md bg-white text-black hover:bg-white/80 border-0 h-10 mt-auto"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <span>Creating Design...</span>
              <div className="ml-2 h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent"></div>
            </>
          ) : (
            <span>Generate Design</span>
          )}
        </Button>
      </form>
    </div>
  );
}