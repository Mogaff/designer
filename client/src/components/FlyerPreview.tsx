import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { GeneratedFlyer } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

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
    <div>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Preview</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={handleDownload}
            disabled={!generatedFlyer}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center"
            onClick={handleShare}
            disabled={!generatedFlyer}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col items-center">
        {!generatedFlyer && !isGenerating ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-slate-700 mb-2">Your flyer will appear here</h3>
            <p className="text-sm text-slate-500 max-w-xs">Fill out the form and click "Generate Flyer" to create your custom design</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="relative page-preview bg-white border border-slate-200" style={{ aspectRatio: '1 / 1.414' }}>
              {generatedFlyer && (
                <img 
                  ref={imageRef}
                  src={generatedFlyer.imageUrl} 
                  alt="Generated flyer" 
                  className="w-full h-full object-contain"
                />
              )}
              {isGenerating && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="mt-4 text-sm font-medium text-slate-700">Generating your flyer...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Sample Templates */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Sample Templates</h3>
        <div className="grid grid-cols-4 gap-4">
          {templates.map((template) => (
            <div 
              key={template.value}
              className={`border ${
                generatedFlyer?.template === template.value 
                  ? 'border-primary border-2' 
                  : 'border-slate-200'
              } rounded-md p-2 hover:border-primary cursor-pointer bg-white`}
            >
              <div className="aspect-[1/1.414] bg-gradient-to-b from-blue-50 to-blue-100 flex flex-col items-center justify-center p-2">
                {template.value === 'default' && (
                  <>
                    <div className="w-full h-1/3 bg-blue-200 mb-2"></div>
                    <div className="w-3/4 h-2 bg-slate-700 mb-1"></div>
                    <div className="w-1/2 h-2 bg-slate-700 mb-3"></div>
                    <div className="w-5/6 h-1 bg-slate-400 mb-1"></div>
                    <div className="w-5/6 h-1 bg-slate-400 mb-1"></div>
                    <div className="w-5/6 h-1 bg-slate-400"></div>
                  </>
                )}
                {template.value === 'minimal' && (
                  <>
                    <div className="w-2/3 h-2 bg-slate-900 mb-1"></div>
                    <div className="w-1/2 h-2 bg-slate-900 mb-4"></div>
                    <div className="w-full h-1/3 bg-slate-100 mb-4"></div>
                    <div className="w-3/4 h-1 bg-slate-400 mb-1"></div>
                    <div className="w-3/4 h-1 bg-slate-400 mb-1"></div>
                    <div className="w-3/4 h-1 bg-slate-400"></div>
                  </>
                )}
                {template.value === 'bold' && (
                  <>
                    <div className="w-5/6 h-3 bg-white mb-1"></div>
                    <div className="w-3/4 h-3 bg-white mb-3"></div>
                    <div className="w-full h-1/4 bg-primary mb-3"></div>
                    <div className="w-3/4 h-1 bg-slate-400 mb-1"></div>
                    <div className="w-3/4 h-1 bg-slate-400 mb-1"></div>
                    <div className="w-3/4 h-1 bg-slate-400"></div>
                  </>
                )}
                {template.value === 'elegant' && (
                  <>
                    <div className="w-1/2 h-1 bg-slate-700 mb-1"></div>
                    <div className="w-3/4 h-3 bg-slate-800 my-1"></div>
                    <div className="w-1/2 h-1 bg-slate-700 mb-3"></div>
                    <div className="w-2/3 h-1/3 bg-slate-200 mb-3"></div>
                    <div className="w-3/4 h-1 bg-slate-500 mb-1"></div>
                    <div className="w-3/4 h-1 bg-slate-500 mb-1"></div>
                    <div className="w-1/2 h-1 bg-slate-500"></div>
                  </>
                )}
              </div>
              <p className="text-xs text-center mt-1 text-slate-600">{template.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
