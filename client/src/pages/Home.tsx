import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AiFlyerForm from "@/components/AiFlyerForm";
import FlyerPreview from "@/components/FlyerPreview";
import DesignSuggestions from "@/components/DesignSuggestions";
import RecentCreations from "@/components/RecentCreations";
import CanvasEditor from "@/components/CanvasEditor";
import { useState } from "react";
import { GeneratedFlyer, DesignVariation } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [generatedFlyer, setGeneratedFlyer] = useState<GeneratedFlyer | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [designSuggestions, setDesignSuggestions] = useState<DesignVariation[] | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>("original");

  return (
    <div className="flex flex-col h-screen overflow-auto">
      <Header />
      
      <main className="max-w-7xl mx-auto pt-12 px-4 lg:px-6 flex-grow flex flex-col">
        <section className="flex-grow flex flex-col">
          {/* Mobile Options & Gallery View - Only visible on mobile */}
          <div className="lg:hidden w-full mb-4">
            <RecentCreations vertical={false} />
          </div>

          <div className="flex flex-col lg:flex-row h-full">
            {/* Left Sidebar - Design Creation Form */}
            <div className="fixed top-[60px] left-0 bottom-0 h-screen w-[25%] z-10 hidden lg:block pl-2 pr-2 py-2 overflow-auto">
              <div className="glass-panel p-3 overflow-auto h-full flex flex-col backdrop-blur-md">
                {designSuggestions ? (
                  <DesignSuggestions 
                    designs={designSuggestions}
                    isGenerating={isGenerating}
                    setGeneratedFlyer={setGeneratedFlyer}
                    setDesignSuggestions={setDesignSuggestions}
                  />
                ) : (
                  <AiFlyerForm
                    setGeneratedFlyer={setGeneratedFlyer}
                    isGenerating={isGenerating}
                    setIsGenerating={setIsGenerating}
                    setDesignSuggestions={setDesignSuggestions}
                    aspectRatio={aspectRatio}
                    setAspectRatio={setAspectRatio}
                  />
                )}
              </div>
            </div>
            
            {/* Right Sidebar - Gallery */}
            <div className="fixed top-[60px] right-0 bottom-0 h-screen w-[15%] z-10 hidden lg:block pr-2 pl-2 py-2 overflow-hidden">
              <div className="glass-panel p-3 overflow-hidden h-full flex flex-col backdrop-blur-md">
                <RecentCreations vertical={true} />
              </div>
            </div>
            
            {/* Main Content Area - Preview and Canvas Editor */}
            <div className="glass-panel p-4 flex-grow overflow-hidden flex flex-col lg:ml-[25%] lg:mr-[15%]">
              {/* Mobile Design Form - Only visible on mobile */}
              <div className="lg:hidden mb-4">
                {designSuggestions ? (
                  <DesignSuggestions 
                    designs={designSuggestions}
                    isGenerating={isGenerating}
                    setGeneratedFlyer={setGeneratedFlyer}
                    setDesignSuggestions={setDesignSuggestions}
                  />
                ) : (
                  <AiFlyerForm
                    setGeneratedFlyer={setGeneratedFlyer}
                    isGenerating={isGenerating}
                    setIsGenerating={setIsGenerating}
                    setDesignSuggestions={setDesignSuggestions}
                    aspectRatio={aspectRatio}
                    setAspectRatio={setAspectRatio}
                  />
                )}
              </div>
              
              {/* Preview and Canvas Editor Tabs */}
              <div className="h-full">
                <Tabs defaultValue="preview" className="h-full flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <TabsList className="bg-black/30 backdrop-blur-sm">
                      <TabsTrigger value="preview" className="text-white data-[state=active]:bg-indigo-600/70">Preview</TabsTrigger>
                      <TabsTrigger value="canvas" className="text-white data-[state=active]:bg-indigo-600/70">Canvas Editor</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <div className="flex-grow overflow-hidden">
                    <TabsContent value="preview" className="h-full m-0 p-0">
                      <FlyerPreview 
                        generatedFlyer={generatedFlyer} 
                        isGenerating={isGenerating}
                        aspectRatio={aspectRatio}
                        showProgress={true} // Enable progress visualization
                      />
                    </TabsContent>
                    
                    <TabsContent value="canvas" className="h-full m-0 p-0">
                      <CanvasEditor 
                        generatedFlyer={generatedFlyer}
                        isGenerating={isGenerating}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
