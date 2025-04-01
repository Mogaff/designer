import { DesignVariation } from "@/lib/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer } from "@/lib/types";
import { CheckCircle } from "lucide-react";

type DesignSuggestionsProps = {
  designs: DesignVariation[] | null;
  isGenerating: boolean;
  setGeneratedFlyer: (flyer: GeneratedFlyer | null) => void;
  setDesignSuggestions: (suggestions: DesignVariation[] | null) => void;
};

export default function DesignSuggestions({ 
  designs, 
  isGenerating, 
  setGeneratedFlyer,
  setDesignSuggestions
}: DesignSuggestionsProps) {
  const [selectedDesign, setSelectedDesign] = useState<number | null>(null);

  // Handle selecting a design
  const handleSelectDesign = (design: DesignVariation) => {
    setSelectedDesign(design.id);
    
    // Create a generated flyer from the selected design
    setGeneratedFlyer({
      imageUrl: design.imageBase64,
      headline: "AI Generated Design",
      content: `Design style: ${design.style}`,
      stylePrompt: design.style,
      template: "ai"
    });
  };

  // Handle finalizing the design choice
  const handleUseDesign = () => {
    if (selectedDesign === null || !designs) return;
    
    // Find the selected design
    const selected = designs.find(d => d.id === selectedDesign);
    if (!selected) return;
    
    // Clear the suggestions to show only the selected design
    setDesignSuggestions(null);
  };

  if (isGenerating) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-2">
          <h2 className="text-base font-semibold text-white">Generating Designs...</h2>
        </div>
        <div className="flex-grow flex items-center justify-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            <p className="text-white/70 text-sm">Creating 4 design variations</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!designs || designs.length === 0) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-2">
        <h2 className="text-base font-semibold text-white">Design Suggestions</h2>
        <p className="text-xs text-white/70">
          Select one of the design variations below
        </p>
      </div>
      
      <div className="flex-grow flex flex-col">
        <div className={`grid ${designs.length <= 2 ? 'grid-cols-1' : 'grid-cols-2'} gap-3 flex-grow`}>
          {designs.map((design) => (
            <div 
              key={design.id}
              className={`
                relative overflow-hidden rounded-lg border-2 cursor-pointer transition-all duration-200
                ${selectedDesign === design.id 
                  ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' 
                  : 'border-gray-800/50 hover:border-indigo-500/50'}
              `}
              onClick={() => handleSelectDesign(design)}
            >
              <div className="relative aspect-[2/3] w-full">
                <img 
                  src={design.imageBase64} 
                  alt={`Design option ${design.id}`}
                  className="w-full h-full object-contain"
                />
                
                {/* Style indicator */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-1.5">
                  <p className="text-[10px] text-white/80 text-center">
                    {design.style}
                  </p>
                </div>
                
                {/* Selection indicator */}
                {selectedDesign === design.id && (
                  <div className="absolute top-2 right-2 text-indigo-500">
                    <CheckCircle size={20} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {selectedDesign !== null && (
          <Button
            onClick={handleUseDesign}
            className="mt-3 w-full font-medium rounded-md bg-indigo-500/40 backdrop-blur-sm text-white hover:bg-indigo-500/60 border-0"
          >
            Use Selected Design
          </Button>
        )}
      </div>
    </div>
  );
}