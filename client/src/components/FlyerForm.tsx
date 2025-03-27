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
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-semibold mb-6">Create Your Flyer</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div>
          <Label htmlFor="image-upload" className="block text-sm font-medium text-slate-700 mb-1">
            Upload Image
          </Label>
          <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-slate-600">
                <label htmlFor="image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/80 focus:outline-none">
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
              <p className="text-xs text-slate-500">PNG, JPG, GIF up to 5MB</p>
            </div>
          </div>
          {imagePreview && (
            <div className="mt-2">
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="h-32 object-cover rounded-md" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="absolute top-1 right-1 bg-white/80 rounded-full p-1 shadow-sm hover:bg-white"
                  onClick={removeImage}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Style Prompt */}
        <div>
          <Label htmlFor="stylePrompt" className="block text-sm font-medium text-slate-700 mb-1">
            Style Prompt
          </Label>
          <Input
            id="stylePrompt"
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            placeholder="e.g., 'make it look like a vintage poster'"
            className="block w-full"
          />
          <p className="mt-1 text-xs text-slate-500">Describe the style you want for your flyer</p>
        </div>
        
        {/* Flyer Headline */}
        <div>
          <Label htmlFor="headline" className="block text-sm font-medium text-slate-700 mb-1">
            Headline
          </Label>
          <Input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Main title for your flyer"
            className="block w-full"
          />
        </div>
        
        {/* Flyer Content */}
        <div>
          <Label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-1">
            Content
          </Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Enter the main text for your flyer..."
            className="block w-full"
          />
        </div>
        
        {/* Template Selection */}
        <div>
          <Label htmlFor="template" className="block text-sm font-medium text-slate-700 mb-1">
            Template
          </Label>
          <Select value={selectedTemplate} onValueChange={selectTemplate}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
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
          className="w-full bg-primary hover:bg-primary/90"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <span>Generating...</span>
              <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            </>
          ) : (
            <span>Generate Flyer</span>
          )}
        </Button>
      </form>
    </div>
  );
}
