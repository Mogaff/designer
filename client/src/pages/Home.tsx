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
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto pt-28 pb-8 px-4 sm:px-6 lg:px-8 flex-grow">
        <section className="mb-16">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3 text-white">
              ha'itu
            </h1>
            <p className="text-white/70 max-w-2xl mx-auto">
              Generate stunning, professional-quality flyers with just a text prompt. 
              Powered by cutting-edge AI to create designs that truly stand out.
            </p>
          </div>
          
          <div className="glass-panel p-8 mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div>
                <AiFlyerForm
                  setGeneratedFlyer={setGeneratedFlyer}
                  isGenerating={isGenerating}
                  setIsGenerating={setIsGenerating}
                />
              </div>
              
              <FlyerPreview 
                generatedFlyer={generatedFlyer} 
                isGenerating={isGenerating}
              />
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
