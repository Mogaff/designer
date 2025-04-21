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
  const [activeTab, setActiveTab] = useState<string>("preview");

  return (
    <div className="flex flex-col min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 to-slate-800">
      <Header />
      
      <main className="w-full flex-grow flex p-3">
        {/* Main Content Area - Full Browser Width */}
        <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-80px)] gap-3">
          {/* Left Sidebar - Contains Design Creation and Tabs */}
          <div className="w-full lg:w-[350px] backdrop-blur-md bg-white/5 border border-white/10 overflow-hidden flex flex-col rounded-lg">
            <div className="p-3 backdrop-blur-md bg-white/5 border-b border-white/10 rounded-t-lg">
              <h2 className="text-white font-bold text-md">Create Design</h2>
            </div>
            
            <div className="flex-grow overflow-auto p-3">
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
            <div className="p-2 backdrop-blur-md bg-white/5 border-b border-white/10 rounded-t-lg">
              <h2 className="text-white font-bold text-sm">Gallery</h2>
            </div>
            <div className="overflow-auto p-2" style={{ height: 'calc(100% - 40px)' }}>
              <RecentCreations vertical={true} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
