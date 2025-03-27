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
    <div className="glass-card">
      <div className="flex items-center mb-4">
        <Sparkles className="h-6 w-6 text-primary mr-2" />
        <h2 className="text-xl font-semibold gradient-text">Award-Winning Design AI</h2>
      </div>
      
      <p className="text-sm text-slate-600 mb-6">
        Our AI is trained to create stunning, creative designs using modern design principles.
        Enter a detailed prompt below and optionally upload an image to include in your flyer.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prompt Input */}
        <div className="space-y-2">
          <Label htmlFor="prompt" className="font-medium text-slate-700">
            Describe Your Flyer
          </Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="Be specific and detailed! Example: 'Create a bold, modern tech event flyer with neon gradients, asymmetrical layout, and 3D elements. The event is called FUTURE TECH 2025, happening March 15-17 at Innovation Center. Include details about AI workshops and VR experiences.'"
            className="block w-full resize-none"
          />
          <div className="flex flex-wrap gap-1 mt-3">
            <Badge className="bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100">mention colors</Badge>
            <Badge className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100">layout style</Badge>
            <Badge className="bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-100">typography</Badge>
            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100">visual effects</Badge>
          </div>
        </div>
        
        <Separator className="bg-slate-200" />
        
        {/* Image Upload - Optional */}
        <div>
          <div className="flex items-center mb-2">
            <ImageIcon className="h-4 w-4 mr-2 text-slate-700" />
            <Label htmlFor="image-upload" className="font-medium text-slate-700">
              Upload Image (Optional)
            </Label>
          </div>
          
          <div className="mt-2">
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
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
                  className="absolute top-2 right-2 opacity-90 rounded-full"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50 hover:bg-slate-100 transition-all">
                <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 mb-2">
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
                  className="bg-white shadow-sm border border-slate-200 text-slate-700"
                  size="sm"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  Select Image
                </Button>
                <p className="text-xs text-slate-500 mt-2">
                  Max file size: 5MB
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center px-4 py-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800">
          <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
          <p className="text-xs">For best results, include specific details about colors, layout, style, and content in your prompt.</p>
        </div>
        
        {/* Generate Button */}
        <Button
          type="submit"
          className="w-full font-medium rounded-full bg-primary hover:bg-primary/90 text-white shadow-md"
          disabled={isGenerating}
          size="lg"
        >
          {isGenerating ? (
            <>
              <span>Creating Masterpiece...</span>
              <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            </>
          ) : (
            <span>Generate Award-Winning Design</span>
          )}
        </Button>
      </form>
    </div>
  );
}