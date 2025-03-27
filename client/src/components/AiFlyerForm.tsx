import { useState, FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer } from "@/lib/types";

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
  const { toast } = useToast();

  const generateAiFlyerMutation = useMutation({
    mutationFn: async (promptData: { prompt: string }) => {
      const response = await apiRequest("POST", "/api/generate-ai", promptData);
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
    generateAiFlyerMutation.mutate({ prompt });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-semibold mb-6">AI Flyer Generator</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prompt Input */}
        <div>
          <Label htmlFor="prompt" className="block text-sm font-medium text-slate-700 mb-1">
            Describe Your Flyer
          </Label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder="Describe the flyer you want to create in detail. For example: 'Create a modern tech conference flyer with a blue theme, featuring information about AI and machine learning talks on May 15th at the Tech Hub.'"
            className="block w-full"
          />
          <p className="mt-1 text-xs text-slate-500">Be specific about what you want - include details about colors, style, content, and layout.</p>
        </div>
        
        {/* Generate Button */}
        <Button
          type="submit"
          className="w-full bg-primary hover:bg-primary/90"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <span>Generating AI Flyer...</span>
              <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            </>
          ) : (
            <span>Generate AI Flyer</span>
          )}
        </Button>
      </form>
    </div>
  );
}