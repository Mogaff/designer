import { useState, ChangeEvent, FormEvent, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer } from "@/lib/types";
import { Upload, X, Palette, Type, FileText, LayoutTemplate } from "lucide-react";

type FlyerFormProps = {
  setGeneratedFlyer: (flyer: GeneratedFlyer | null) => void;
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
};

export default function FlyerForm({ 
  setGeneratedFlyer,
  isGenerating,
  setIsGenerating
}: FlyerFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState("default");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [stylePrompt, setStylePrompt] = useState("");
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const generateFlyerMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/generate", formData);
      return response.blob();
    },
    onSuccess: (blob) => {
      const imageUrl = URL.createObjectURL(blob);
      setGeneratedFlyer({
        imageUrl,
        headline,
        content,
        stylePrompt,
        template: selectedTemplate
      });
      setIsGenerating(false);
      toast({
        title: "Success!",
        description: "Your flyer has been generated successfully.",
      });
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate flyer",
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image less than 5MB",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!imagePreview) {
      toast({
        title: "Image required",
        description: "Please upload an image for your flyer",
        variant: "destructive",
      });
      return;
    }

    if (!headline.trim()) {
      toast({
        title: "Headline required",
        description: "Please enter a headline for your flyer",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    // Create FormData for the file upload
    const formData = new FormData();
    if (fileInputRef.current?.files?.[0]) {
      formData.append("image", fileInputRef.current.files[0]);
    }
    formData.append("prompt", stylePrompt);
    formData.append("headline", headline);
    formData.append("content", content);
    formData.append("template", selectedTemplate);

    generateFlyerMutation.mutate(formData);
  };

  const selectTemplate = (template: string) => {
    setSelectedTemplate(template);
  };

  return (
    <div className="glass-card bg-black/30">
      <div className="flex items-center mb-4">
        <LayoutTemplate className="h-6 w-6 text-amber-300 mr-2" />
        <h2 className="text-xl font-semibold text-white gradient-text">Template Designer</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div>
          <Label htmlFor="image-upload" className="flex items-center text-sm font-medium text-white/90 mb-2">
            <Upload className="h-4 w-4 mr-1.5" /> Upload Image
          </Label>
          
          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-white/20 glass-panel mt-2">
              <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-90 rounded-full"
                onClick={removeImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="mt-1 flex items-center justify-center p-6 border-2 border-dashed border-white/20 rounded-2xl bg-white/5 hover:bg-white/10 transition-all">
              <div className="space-y-2 text-center">
                <Upload className="mx-auto h-10 w-10 text-white/40" />
                <div className="text-sm text-white/70">
                  <label htmlFor="image-upload" className="relative cursor-pointer font-medium text-rose-300 hover:text-rose-400 focus:outline-none">
                    <span>Upload a file</span>
                    <input
                      id="image-upload"
                      ref={fileInputRef}
                      name="image-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-white/50">PNG, JPG, GIF up to 5MB</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Style Prompt */}
        <div>
          <Label htmlFor="stylePrompt" className="flex items-center text-sm font-medium text-white/90 mb-2">
            <Palette className="h-4 w-4 mr-1.5" /> Style Prompt
          </Label>
          <Input
            id="stylePrompt"
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            placeholder="e.g., 'make it look like a vintage poster'"
            className="block w-full bg-white/10 border-white/10 text-white placeholder:text-white/50"
          />
          <p className="mt-1 text-xs text-white/60">Describe the style you want for your flyer</p>
        </div>
        
        {/* Flyer Headline */}
        <div>
          <Label htmlFor="headline" className="flex items-center text-sm font-medium text-white/90 mb-2">
            <Type className="h-4 w-4 mr-1.5" /> Headline
          </Label>
          <Input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Main title for your flyer"
            className="block w-full bg-white/10 border-white/10 text-white placeholder:text-white/50"
          />
        </div>
        
        {/* Flyer Content */}
        <div>
          <Label htmlFor="content" className="flex items-center text-sm font-medium text-white/90 mb-2">
            <FileText className="h-4 w-4 mr-1.5" /> Content
          </Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Enter the main text for your flyer..."
            className="block w-full resize-none bg-white/10 border-white/10 text-white placeholder:text-white/50"
          />
        </div>
        
        {/* Template Selection */}
        <div>
          <Label htmlFor="template" className="flex items-center text-sm font-medium text-white/90 mb-2">
            <LayoutTemplate className="h-4 w-4 mr-1.5" /> Template
          </Label>
          <Select value={selectedTemplate} onValueChange={selectTemplate}>
            <SelectTrigger className="w-full bg-white/10 border-white/10 text-white">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1836] border-white/10 text-white">
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="minimal">Minimal</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
              <SelectItem value="elegant">Elegant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Generate Button */}
        <Button
          type="submit"
          className="w-full font-medium rounded-lg bg-gradient-to-r from-coral-400 to-coral-500 hover:from-coral-500 hover:to-coral-600 border-0"
          disabled={isGenerating}
          size="lg"
        >
          {isGenerating ? (
            <>
              <span>Generating...</span>
              <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            </>
          ) : (
            <span>Generate Template Flyer</span>
          )}
        </Button>
      </form>
    </div>
  );
}
