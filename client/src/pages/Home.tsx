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

  return (
    <div className="flex flex-col h-screen overflow-auto">
      <Header />
      
      <main className="max-w-6xl mx-auto pt-12 px-6 lg:px-10 flex-grow flex flex-col">
        <section className="flex-grow flex flex-col">
          <div className="flex flex-col lg:flex-row gap-2 h-full">
            {/* Main Generator + Preview */}
            <div className="glass-panel p-4 flex-grow overflow-hidden flex flex-col lg:w-9/10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
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
                    />
                  )}
                </div>
                
                <div className="h-full flex flex-col">
                  <FlyerPreview 
                    generatedFlyer={generatedFlyer} 
                    isGenerating={isGenerating}
                  />
                </div>
              </div>
            </div>
            
            {/* Recent Designs Gallery - Vertical */}
            <div className="glass-panel p-4 overflow-hidden lg:w-1/10 flex flex-col">
              <RecentCreations vertical={true} />
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
