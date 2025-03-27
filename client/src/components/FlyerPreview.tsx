import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Download, Share2, Image } from "lucide-react";

type Template = {
  name: string;
  value: string;
};

const templates: Template[] = [
  { name: "Default", value: "default" },
  { name: "Minimal", value: "minimal" },
  { name: "Bold", value: "bold" },
  { name: "Elegant", value: "elegant" },
];

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
    <div className="glass-card">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold gradient-text">Preview</h2>
        <div className="flex space-x-2">
          <Button
            className="btn-glass"
            size="sm"
            onClick={handleDownload}
            disabled={!generatedFlyer}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Download
          </Button>
          <Button
            className="btn-glass"
            size="sm"
            onClick={handleShare}
            disabled={!generatedFlyer}
          >
            <Share2 className="h-4 w-4 mr-1.5" />
            Share
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col items-center">
        {!generatedFlyer && !isGenerating ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="glass-panel p-4 rounded-full mb-4 bg-primary/10">
              <Image className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">Your flyer will appear here</h3>
            <p className="text-sm text-slate-500 max-w-xs">Fill out the form and click "Generate Flyer" to create your custom design</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="relative page-preview rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ aspectRatio: '1 / 1.414' }}>
              {generatedFlyer && (
                <img 
                  ref={imageRef}
                  src={generatedFlyer.imageUrl} 
                  alt="Generated flyer" 
                  className="w-full h-full object-contain"
                />
              )}
              {isGenerating && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="mt-4 text-sm font-medium text-slate-700">Generating your masterpiece...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Sample Templates */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Design Styles</h3>
        <div className="grid grid-cols-4 gap-4">
          {templates.map((template) => (
            <div 
              key={template.value}
              className={`border ${
                generatedFlyer?.template === template.value 
                  ? 'border-primary border-2' 
                  : 'border-slate-200'
              } rounded-xl p-2 hover:border-primary cursor-pointer bg-white shadow-sm transition-all`}
            >
              <div className="aspect-[1/1.414] bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center p-2 rounded-lg">
                {template.value === 'default' && (
                  <>
                    <div className="w-full h-1/3 bg-primary/10 mb-2 rounded-md"></div>
                    <div className="w-3/4 h-2 bg-slate-700 mb-1 rounded-full"></div>
                    <div className="w-1/2 h-2 bg-slate-700 mb-3 rounded-full"></div>
                    <div className="w-5/6 h-1 bg-slate-400 mb-1 rounded-full"></div>
                    <div className="w-5/6 h-1 bg-slate-400 mb-1 rounded-full"></div>
                    <div className="w-5/6 h-1 bg-slate-400 rounded-full"></div>
                  </>
                )}
                {template.value === 'minimal' && (
                  <>
                    <div className="w-2/3 h-2 bg-slate-800 mb-1 rounded-full"></div>
                    <div className="w-1/2 h-2 bg-slate-800 mb-4 rounded-full"></div>
                    <div className="w-full h-1/3 bg-slate-100 mb-4 rounded-md"></div>
                    <div className="w-3/4 h-1 bg-slate-400 mb-1 rounded-full"></div>
                    <div className="w-3/4 h-1 bg-slate-400 mb-1 rounded-full"></div>
                    <div className="w-3/4 h-1 bg-slate-400 rounded-full"></div>
                  </>
                )}
                {template.value === 'bold' && (
                  <>
                    <div className="w-5/6 h-3 bg-slate-900 mb-1 rounded-full"></div>
                    <div className="w-3/4 h-3 bg-slate-900 mb-3 rounded-full"></div>
                    <div className="w-full h-1/4 bg-primary/20 mb-3 rounded-md"></div>
                    <div className="w-3/4 h-1 bg-slate-400 mb-1 rounded-full"></div>
                    <div className="w-3/4 h-1 bg-slate-400 mb-1 rounded-full"></div>
                    <div className="w-3/4 h-1 bg-slate-400 rounded-full"></div>
                  </>
                )}
                {template.value === 'elegant' && (
                  <>
                    <div className="w-1/2 h-1 bg-slate-600 mb-1 rounded-full"></div>
                    <div className="w-3/4 h-3 bg-slate-800 my-1 rounded-full"></div>
                    <div className="w-1/2 h-1 bg-slate-600 mb-3 rounded-full"></div>
                    <div className="w-2/3 h-1/3 bg-slate-100 mb-3 rounded-md"></div>
                    <div className="w-3/4 h-1 bg-slate-400 mb-1 rounded-full"></div>
                    <div className="w-3/4 h-1 bg-slate-400 mb-1 rounded-full"></div>
                    <div className="w-1/2 h-1 bg-slate-400 rounded-full"></div>
                  </>
                )}
              </div>
              <p className="text-xs text-center mt-2 text-slate-600">{template.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
