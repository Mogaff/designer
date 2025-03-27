import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Download, Share2, Image } from "lucide-react";

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
    link.download = `flyer-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!generatedFlyer) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Generated Flyer",
          text: "Check out this flyer I created!",
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
    <div className="glass-card bg-black/30">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Preview</h2>
        <div className="flex space-x-2">
          <Button
            className="btn-primary"
            size="sm"
            onClick={handleDownload}
            disabled={!generatedFlyer}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Download
          </Button>
          <Button
            className="btn-secondary"
            size="sm"
            onClick={handleShare}
            disabled={!generatedFlyer}
          >
            <Share2 className="h-4 w-4 mr-1.5" />
            Share
          </Button>
        </div>
      </div>
      
      <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 flex flex-col items-center">
        {!generatedFlyer && !isGenerating ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="glass-panel p-4 rounded-full mb-4">
              <Image className="h-12 w-12 text-white/70" />
            </div>
            <h3 className="text-lg font-medium text-white/90 mb-2">Your flyer will appear here</h3>
            <p className="text-sm text-white/60 max-w-xs">Fill out the form and click "Generate Design" to create your custom flyer</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="relative page-preview rounded-xl overflow-hidden border border-white/20" style={{ aspectRatio: '1 / 1.414' }}>
              {generatedFlyer && (
                <img 
                  ref={imageRef}
                  src={generatedFlyer.imageUrl} 
                  alt="Generated flyer" 
                  className="w-full h-full object-contain"
                />
              )}
              {isGenerating && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
                    <p className="mt-4 text-sm font-medium text-white/90">Generating your design...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
