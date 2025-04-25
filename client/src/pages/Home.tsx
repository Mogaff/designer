import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AiFlyerFormWithTemplates from "@/components/AiFlyerFormWithTemplates";
import FlyerPreview from "@/components/FlyerPreview";
import DesignSuggestions from "@/components/DesignSuggestions";
import RecentCreations from "@/components/RecentCreations";
import CanvasEditor from "@/components/CanvasEditor";
import { BrandKitPanel } from "@/components/BrandKitPanel";
import { useState, useEffect } from "react";
import { GeneratedFlyer, DesignVariation, DesignTemplate } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Star } from "lucide-react";

export default function Home() {
  const [generatedFlyer, setGeneratedFlyer] = useState<GeneratedFlyer | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [designSuggestions, setDesignSuggestions] = useState<DesignVariation[] | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("original");
  const [activeTab, setActiveTab] = useState<string>("preview");
  const [isBrandKitPanelOpen, setIsBrandKitPanelOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DesignTemplate | null>(null);
  const { toast } = useToast();
  
  // Listen for template selection events from sidebar
  useEffect(() => {
    const handleTemplateSelected = (event: any) => {
      const template = event.detail?.template as DesignTemplate;
      if (template) {
        setSelectedTemplate(template);
        toast({
          title: `Template Selected: ${template.name}`,
          description: `Using design style: ${template.category} - ${template.description}`,
        });
        
        // Generate a prompt based on the template style
        const templatePrompt = `Create a professional design in the style of ${template.name} (${template.category}). 
Key features: ${template.tags.join(', ')}. 
Style description: ${template.description}.
Use ${template.styleData?.glassMorphism ? 'glass morphism effects with transparency and blur' : 'modern design elements'}.
${template.styleData?.neonEffects ? 'Include subtle neon glowing elements where appropriate.' : ''}
Create this as an advertisement design, NOT as a website or HTML.`;

        // Set a relevant aspect ratio for the template if needed
        if (template.category === "Social Media" || template.tags.includes("social")) {
          setAspectRatio("post"); // 1:1 for social posts
        } else if (template.category === "Banner" || template.tags.includes("banner")) {
          setAspectRatio("fb_cover"); // Wide format for banners
        }
        
        // Set active tab to canvas editor
        setActiveTab("canvas");
      }
    };
    
    window.addEventListener('template-selected', handleTemplateSelected);
    
    // Handle direct navigation with template in state
    const state = window.history.state;
    if (state?.template) {
      handleTemplateSelected({ detail: { template: state.template } });
    }
    
    return () => {
      window.removeEventListener('template-selected', handleTemplateSelected);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 to-slate-800">
      <Header />
      
      <main className="w-full flex-grow flex p-3">
        {/* Main Content Area - Full Browser Width */}
        <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-80px)] gap-3 mt-10">
          {/* Left Sidebar - Contains Design Creation and Tabs */}
          <div className="w-full lg:w-[400px] backdrop-blur-md bg-white/5 border border-white/10 overflow-hidden flex flex-col rounded-lg relative">
            {/* Brand Kit Panel as a child of the Create Design panel */}
            <BrandKitPanel 
              isOpen={isBrandKitPanelOpen && !selectedTemplate} 
              onClose={() => setIsBrandKitPanelOpen(false)} 
            />
            
            <div className="flex-grow overflow-auto p-3">
              {selectedTemplate ? (
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Template: {selectedTemplate.name}</h2>
                    <button 
                      onClick={() => setSelectedTemplate(null)}
                      className="text-white/70 hover:text-white text-sm py-1 px-2 rounded bg-white/10 hover:bg-white/20"
                    >
                      Change Template
                    </button>
                  </div>
                  
                  <div className="aspect-[4/3] relative rounded-lg overflow-hidden border border-white/20">
                    <img 
                      src={selectedTemplate.previewUrl} 
                      alt={selectedTemplate.name}
                      className="w-full h-full object-cover"
                    />
                    {selectedTemplate.isPremium && (
                      <div className="absolute top-2 right-2">
                        <span className="bg-amber-500 text-white text-xs py-0.5 px-2 rounded-md font-semibold flex items-center">
                          <Star className="h-3 w-3 mr-1" /> Premium
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <h3 className="text-white font-medium text-sm mb-2">Template Style</h3>
                    <p className="text-white/70 text-sm">{selectedTemplate.description}</p>
                    
                    <div className="flex flex-wrap gap-1 mt-3">
                      {selectedTemplate.tags.map(tag => (
                        <span key={tag} className="text-[10px] py-0.5 px-1.5 bg-white/10 text-white/70 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-white font-medium text-sm">Design Options</h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/5 p-2 rounded border border-white/10 flex items-center">
                        <input type="checkbox" checked={selectedTemplate.styleData?.glassMorphism} readOnly className="mr-2" />
                        <span className="text-white/80 text-xs">Glass Effects</span>
                      </div>
                      
                      <div className="bg-white/5 p-2 rounded border border-white/10 flex items-center">
                        <input type="checkbox" checked={selectedTemplate.styleData?.neonEffects} readOnly className="mr-2" />
                        <span className="text-white/80 text-xs">Neon Effects</span>
                      </div>
                    </div>
                  </div>
                  
                  <AiFlyerFormWithTemplates
                    setGeneratedFlyer={setGeneratedFlyer}
                    isGenerating={isGenerating}
                    setIsGenerating={setIsGenerating}
                    setDesignSuggestions={setDesignSuggestions}
                    aspectRatio={aspectRatio}
                    setAspectRatio={setAspectRatio}
                    onOpenBrandKitPanel={() => setIsBrandKitPanelOpen(true)}
                    selectedTemplate={selectedTemplate}
                  />
                </div>
              ) : designSuggestions ? (
                <DesignSuggestions 
                  designs={designSuggestions}
                  isGenerating={isGenerating}
                  setGeneratedFlyer={setGeneratedFlyer}
                  setDesignSuggestions={setDesignSuggestions}
                />
              ) : (
                <AiFlyerFormWithTemplates
                  setGeneratedFlyer={setGeneratedFlyer}
                  isGenerating={isGenerating}
                  setIsGenerating={setIsGenerating}
                  setDesignSuggestions={setDesignSuggestions}
                  aspectRatio={aspectRatio}
                  setAspectRatio={setAspectRatio}
                  onOpenBrandKitPanel={() => setIsBrandKitPanelOpen(true)}
                />
              )}
            </div>
          </div>
          
          {/* Main Content Area - Workspace/Canvas */}
          <div className="flex-grow relative overflow-hidden flex flex-col">
            {/* We'll use Tabs component here for proper setup */}
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="h-full relative"
            >
              {/* Tab Controls */}
              <div className="absolute top-2 left-4 z-20">
                <TabsList className="backdrop-blur-md bg-white/5 border border-white/10">
                  <TabsTrigger value="preview" className="text-white data-[state=active]:bg-white/20">
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="canvas" className="text-white data-[state=active]:bg-white/20">
                    Canvas Editor
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {/* Workspace - Full Screen Canvas */}
              <div className="h-full">
                {/* Preview Area */}
                <TabsContent value="preview" className="h-full m-0 p-0 data-[state=inactive]:hidden data-[state=active]:block">
                  <FlyerPreview 
                    generatedFlyer={generatedFlyer} 
                    isGenerating={isGenerating}
                    aspectRatio={aspectRatio}
                    showProgress={true}
                  />
                </TabsContent>
                
                {/* Canvas Editor Area */}
                <TabsContent value="canvas" className="h-full m-0 p-0 data-[state=inactive]:hidden data-[state=active]:block">
                  <CanvasEditor 
                    generatedFlyer={generatedFlyer}
                    isGenerating={isGenerating}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
          
          {/* Right Sidebar - Gallery */}
          <div className="hidden lg:block w-[240px] backdrop-blur-md bg-white/5 border border-white/10 overflow-hidden rounded-lg h-[calc(100vh-80px)]">
            <div className="overflow-auto p-2">
              <RecentCreations vertical={true} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
