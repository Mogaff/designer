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
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate AI flyer",
        variant: "destructive",
      });
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
    <div className="glass-card bg-black/30">
      <div className="flex items-center mb-4">
        <Sparkles className="h-6 w-6 text-teal-300 mr-2" />
        <h2 className="text-xl font-semibold text-white gradient-text">AI Flyer Designer</h2>
      </div>
      
      <p className="text-sm text-white/70 mb-6">
        Our AI is trained to create stunning, creative designs using modern design principles.
        Enter a detailed prompt below and optionally upload an image to include in your flyer.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prompt Input */}
        <div className="space-y-2">
          <Label htmlFor="prompt" className="font-medium text-white/90">
            Describe Your Flyer
          </Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="Be specific and detailed! Example: 'Create a bold, modern tech event flyer with teal gradients, geometric layout, and subtle patterns. The event is called FUTURE TECH 2025, happening March 15-17 at Innovation Center. Include details about AI workshops and VR experiences.'"
            className="block w-full resize-none bg-white/10 border-white/10 text-white placeholder:text-white/50"
          />
          <div className="flex flex-wrap gap-1 mt-3">
            <Badge className="bg-white/10 text-teal-200 border-teal-300/20 hover:bg-white/20">mention colors</Badge>
            <Badge className="bg-white/10 text-coral-200 border-coral-300/20 hover:bg-white/20">layout style</Badge>
            <Badge className="bg-white/10 text-teal-200 border-teal-300/20 hover:bg-white/20">typography</Badge>
            <Badge className="bg-white/10 text-coral-200 border-coral-300/20 hover:bg-white/20">visual effects</Badge>
          </div>
        </div>
        
        <Separator className="bg-white/10" />
        
        {/* Image Upload - Optional */}
        <div>
          <div className="flex items-center mb-2">
            <ImageIcon className="h-4 w-4 mr-2 text-white/80" />
            <Label htmlFor="image-upload" className="font-medium text-white/90">
              Upload Image (Optional)
            </Label>
          </div>
          
          <div className="mt-2">
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-white/20 glass-panel">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-48 object-cover" 
                />
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm" 
                  onClick={clearImage}
                  className="absolute top-2 right-2 opacity-90 rounded-lg"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center bg-white/5 hover:bg-white/10 transition-all">
                <Upload className="h-8 w-8 mx-auto text-white/40 mb-2" />
                <p className="text-sm text-white/70 mb-2">
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
                  className="btn-teal"
                  size="sm"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  Select Image
                </Button>
                <p className="text-xs text-white/50 mt-2">
                  Max file size: 5MB
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center px-4 py-3 bg-teal-900/30 backdrop-blur-sm text-teal-200 rounded-xl border border-teal-500/20">
          <AlertTriangle className="h-4 w-4 mr-2 text-teal-400" />
          <p className="text-xs">For best results, include specific details about colors, layout, style, and content in your prompt.</p>
        </div>
        
        {/* Generate Button */}
        <Button
          type="submit"
          className="w-full font-medium rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 border-0"
          disabled={isGenerating}
          size="lg"
        >
          {isGenerating ? (
            <>
              <span>Creating Design...</span>
              <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            </>
          ) : (
            <span>Generate Flyer Design</span>
          )}
        </Button>
      </form>
    </div>
  );
}