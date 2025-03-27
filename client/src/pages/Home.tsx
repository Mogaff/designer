import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AiFlyerForm from "@/components/AiFlyerForm";
import FlyerPreview from "@/components/FlyerPreview";
import { useState } from "react";
import { GeneratedFlyer } from "@/lib/types";

export default function Home() {
  const [generatedFlyer, setGeneratedFlyer] = useState<GeneratedFlyer | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      
      <main className="max-w-full mx-auto pt-16 px-6 lg:px-12 flex-grow flex flex-col">
        <section className="flex-grow flex flex-col h-full">
          <div className="text-center mb-2">
            <h1 className="text-3xl font-bold mb-1 text-white">
              ha'itu
            </h1>
            <p className="text-white/70 text-sm max-w-3xl mx-auto">
              Generate stunning, professional-quality flyers with AI
            </p>
          </div>
          
          <div className="glass-panel p-4 flex-grow overflow-hidden flex flex-col">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              <div className="overflow-auto">
                <AiFlyerForm
                  setGeneratedFlyer={setGeneratedFlyer}
                  isGenerating={isGenerating}
                  setIsGenerating={setIsGenerating}
                />
              </div>
              
              <div className="overflow-auto">
                <FlyerPreview 
                  generatedFlyer={generatedFlyer} 
                  isGenerating={isGenerating}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
