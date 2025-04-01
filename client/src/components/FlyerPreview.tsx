import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Download, Share2, Image } from "lucide-react";
import { MultiColorLoading } from "@/components/ui/multi-color-loading";

type FlyerPreviewProps = {
  generatedFlyer: GeneratedFlyer | null;
  isGenerating: boolean;
};

export default function FlyerPreview({ generatedFlyer, isGenerating }: FlyerPreviewProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();

  const handleDownload = () => {
    if (!generatedFlyer) return;

    const link = document.createElement("a");
    link.href = generatedFlyer.imageUrl;
    link.download = `design-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!generatedFlyer) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Generated Design",
          text: "Check out this design I created!",
          url: generatedFlyer.imageUrl,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      toast({
        title: "Share not supported",
        description: "Sharing is not supported on this browser",
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-2 flex justify-between items-center">
        <h2 className="text-base font-semibold text-white">Preview</h2>
        <div className="flex space-x-2">
          <Button
            className="bg-indigo-500/20 backdrop-blur-sm border-none text-white h-7 px-3 py-1 text-xs hover:bg-indigo-500/30"
            size="sm"
            onClick={handleDownload}
            disabled={!generatedFlyer}
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
          <Button
            className="bg-indigo-500/20 backdrop-blur-sm border-none text-white h-7 px-3 py-1 text-xs hover:bg-indigo-500/30"
            size="sm"
            onClick={handleShare}
            disabled={!generatedFlyer}
          >
            <Share2 className="h-3 w-3 mr-1" />
            Share
          </Button>
        </div>
      </div>
      
      <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 flex-grow flex items-center justify-center">
        {!generatedFlyer && !isGenerating ? (
          <div className="flex flex-col items-center justify-center text-center h-full w-full">
            <div className="glass-panel p-3 rounded-full mb-2">
              <Image className="h-12 w-12 text-white/70" />
            </div>
            <h3 className="text-base font-medium text-white/90 mb-1">Your design will appear here</h3>
            <p className="text-xs text-white/60 max-w-xs">Fill out the form and click "Generate Design"</p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex-1 h-full flex items-center justify-center relative">
              {generatedFlyer && (
                <img 
                  ref={imageRef}
                  src={generatedFlyer.imageUrl} 
                  alt="Generated design" 
                  className="max-h-full max-w-full object-contain"
                  style={{ display: 'block' }}
                />
              )}
              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <MultiColorLoading className="w-full h-full rounded-xl" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
