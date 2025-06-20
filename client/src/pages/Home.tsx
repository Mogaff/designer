import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AiFlyerFormWithTemplates from "@/components/AiFlyerFormWithTemplates";
import AiFlyerFormCompact from "@/components/AiFlyerFormCompact";
import FlyerPreview from "@/components/FlyerPreview";
import DesignSuggestions from "@/components/DesignSuggestions";
import SimpleGallery from "@/components/SimpleGallery";
import CanvasEditor from "@/components/CanvasEditor";
import { BrandKitPanel } from "@/components/BrandKitPanel";
import { AnimatedTransformationShowcase } from "@/components/AnimatedTransformationShowcase";
import { useState, useEffect } from "react";
import { GeneratedFlyer, DesignVariation, DesignTemplate } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Star } from "lucide-react";
import meshGradient from "@assets/image-mesh-gradient (18).png";

export default function Home() {
  const [generatedFlyer, setGeneratedFlyer] = useState<GeneratedFlyer | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [designSuggestions, setDesignSuggestions] = useState<DesignVariation[] | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("original");
  const [activeTab, setActiveTab] = useState<string>("preview");
  const [isBrandKitPanelOpen, setIsBrandKitPanelOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DesignTemplate | null>(null);
  const [isCarouselView, setIsCarouselView] = useState(false);
  const [showTransformation, setShowTransformation] = useState(false);
  const { toast } = useToast();
  
  // Make state variables available to other components via window object
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.designSuggestions = designSuggestions;
      window.setShowTransformation = setShowTransformation;
      window.isCarouselView = isCarouselView;
    }
  }, [designSuggestions, setShowTransformation, isCarouselView]);

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
    <div className="flex flex-col min-h-screen overflow-hidden relative">
      {/* Background gradient image */}
      <div className="absolute inset-0 z-0">
        <img src={meshGradient} alt="" className="w-full h-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
      </div>
      
      <Header />
      
      <main className="w-full flex-grow flex p-3 relative z-10">
        {/* Animation Transformation Showcase Modal */}
        {showTransformation && designSuggestions && designSuggestions.length > 1 && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900/90 border border-indigo-500/30 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-3 border-b border-indigo-500/30 flex justify-between items-center">
                <h3 className="text-white font-medium text-sm">Design Transformation Showcase</h3>
                <button 
                  className="h-8 w-8 p-0 rounded-full hover:bg-white/10 flex items-center justify-center"
                  onClick={() => setShowTransformation(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/70 hover:text-white">
                    <path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>
                  </svg>
                </button>
              </div>
              
              <div className="p-4 flex-grow flex flex-col">
                <p className="text-white/70 text-xs mb-4">
                  Watch as your image transforms between different design styles. This visualization showcases the AI's ability to reimagine your content in multiple ways.
                </p>
                
                <div className="flex-grow relative rounded-lg overflow-hidden">
                  <AnimatedTransformationShowcase 
                    designs={designSuggestions}
                    aspectRatio={aspectRatio}
                    isActive={showTransformation}
                    onComplete={() => {
                      // Optional: do something when animation completes
                    }}
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-white/60 text-[10px]">
                    Cycling through {designSuggestions.length} unique design variations
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Watch Transformation Button removed from here - now in FlyerPreview */}
        
        {/* Main Content Area - Full Browser Width */}
        <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-80px)] gap-3 mt-10">
          {/* Left Sidebar - Contains Design Creation and Tabs */}
          <div className="w-full lg:w-[250px] backdrop-blur-md bg-white/5 border border-white/10 overflow-hidden flex flex-col rounded-lg relative">
            {/* Brand Kit Panel as a child of the Create Design panel */}
            <BrandKitPanel 
              isOpen={isBrandKitPanelOpen && !selectedTemplate} 
              onClose={() => setIsBrandKitPanelOpen(false)} 
            />
            
            <div className="flex-grow overflow-auto p-2">
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
                    setIsCarouselView={setIsCarouselView}
                  />
                </div>
              ) : designSuggestions ? (
                <DesignSuggestions 
                  designs={designSuggestions}
                  isGenerating={isGenerating}
                  setGeneratedFlyer={setGeneratedFlyer}
                  setDesignSuggestions={setDesignSuggestions}
                  isCarousel={isCarouselView}
                />
              ) : (
                <AiFlyerFormCompact
                  setGeneratedFlyer={setGeneratedFlyer}
                  isGenerating={isGenerating}
                  setIsGenerating={setIsGenerating}
                  setDesignSuggestions={setDesignSuggestions}
                  aspectRatio={aspectRatio}
                  setAspectRatio={setAspectRatio}
                  onOpenBrandKitPanel={() => setIsBrandKitPanelOpen(true)}
                  setIsCarouselView={setIsCarouselView}
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
              {/* Tab Controls - 50% Smaller Sleek Glass Pill Design */}
              <div className="absolute top-2 left-2 z-20 scale-75 origin-top-left">
                <TabsList className="relative backdrop-blur-sm bg-white/10 border border-white/10 shadow rounded-full h-5 p-0.5 flex items-center overflow-hidden">
                  <div 
                    className={`absolute inset-y-0.5 transition-all duration-200 rounded-full bg-white/20 backdrop-blur-sm ${activeTab === 'preview' ? 'left-0.5 right-[calc(50%_+_0.5px)]' : 'left-[calc(50%_+_0.5px)] right-0.5'}`}
                    style={{
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)',
                      transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                  ></div>
                  <TabsTrigger 
                    value="preview" 
                    className="z-10 text-[10px] px-3 h-4 flex-1 text-white data-[state=active]:text-white data-[state=active]:shadow-none relative overflow-hidden"
                  >
                    <span className="relative z-10">Preview</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="canvas" 
                    className="z-10 text-[10px] px-3 h-4 flex-1 text-white data-[state=active]:text-white data-[state=active]:shadow-none relative overflow-hidden"
                  >
                    <span className="relative z-10">Editor</span>
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
          
          {/* Right Sidebar - Gallery - Simplified */}
          <div className="hidden lg:block w-[120px] backdrop-blur-md bg-white/5 border border-white/10 overflow-hidden rounded-lg h-[calc(100vh-80px)]">
            <SimpleGallery />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}