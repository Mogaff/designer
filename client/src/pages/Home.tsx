import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FlyerForm from "@/components/FlyerForm";
import AiFlyerForm from "@/components/AiFlyerForm";
import FlyerPreview from "@/components/FlyerPreview";
import FlyerExamples from "@/components/FlyerExamples";
import { useState } from "react";
import { GeneratedFlyer } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [generatedFlyer, setGeneratedFlyer] = useState<GeneratedFlyer | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("ai");

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      <Header />
      
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex-grow">
        <section className="mb-10">
          <h1 className="text-3xl font-bold text-center mb-2">AI Flyer Generator</h1>
          <p className="text-center text-slate-600 mb-6">
            Generate professional-looking flyers with just a text prompt using AI
          </p>
          
          <Tabs defaultValue="ai" onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="ai">AI Prompt Flyer</TabsTrigger>
              <TabsTrigger value="template">Template Flyer</TabsTrigger>
            </TabsList>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <TabsContent value="ai" className="mt-0">
                  <AiFlyerForm
                    setGeneratedFlyer={setGeneratedFlyer}
                    isGenerating={isGenerating}
                    setIsGenerating={setIsGenerating}
                  />
                </TabsContent>
                
                <TabsContent value="template" className="mt-0">
                  <FlyerForm
                    setGeneratedFlyer={setGeneratedFlyer}
                    isGenerating={isGenerating}
                    setIsGenerating={setIsGenerating}
                  />
                </TabsContent>
              </div>
              
              <FlyerPreview 
                generatedFlyer={generatedFlyer} 
                isGenerating={isGenerating}
              />
            </div>
          </Tabs>
        </section>
        
        {/* Only show examples when template tab is active */}
        {activeTab === "template" && <FlyerExamples />}
      </main>
      
      <Footer />
    </div>
  );
}
