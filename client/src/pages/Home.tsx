import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FlyerForm from "@/components/FlyerForm";
import FlyerPreview from "@/components/FlyerPreview";
import FlyerExamples from "@/components/FlyerExamples";
import { useState } from "react";
import { GeneratedFlyer } from "@/lib/types";

export default function Home() {
  const [generatedFlyer, setGeneratedFlyer] = useState<GeneratedFlyer | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      <Header />
      
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <FlyerForm
            setGeneratedFlyer={setGeneratedFlyer}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
          />
          <FlyerPreview 
            generatedFlyer={generatedFlyer} 
            isGenerating={isGenerating}
          />
        </div>
        
        <FlyerExamples />
      </main>
      
      <Footer />
    </div>
  );
}
