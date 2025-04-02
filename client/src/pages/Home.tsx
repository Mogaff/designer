import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AiFlyerForm from "@/components/AiFlyerForm";
import FlyerPreview from "@/components/FlyerPreview";
import DesignSuggestions from "@/components/DesignSuggestions";
import RecentCreations from "@/components/RecentCreations";
import { useState } from "react";
import { GeneratedFlyer, DesignVariation } from "@/lib/types";

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
          {/* Mobile Gallery View */}
          <div className="lg:hidden w-full mb-4">
            <RecentCreations vertical={false} />
          </div>

          <div className="flex flex-col h-full">
            <div className="fixed top-[60px] right-0 bottom-0 h-screen w-[25%] z-10 hidden lg:block pr-2 pl-2 py-2 overflow-hidden">
              {/* Erweiterte und breitere Galerie-Seitenleiste - ganz rechts positioniert */}
              <div className="glass-panel p-3 overflow-hidden h-full flex flex-col backdrop-blur-md">
                <RecentCreations vertical={true} />
              </div>
            </div>
            
            {/* Main Generator + Preview - nimmt den restlichen Platz ein */}
            <div className="glass-panel p-4 flex-grow overflow-hidden flex flex-col lg:mr-[25%]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                <div>
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
                
                <div className="h-full flex flex-col">
                  <FlyerPreview 
                    generatedFlyer={generatedFlyer} 
                    isGenerating={isGenerating}
                    aspectRatio={aspectRatio}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
