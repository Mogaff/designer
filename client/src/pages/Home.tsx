import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FlyerForm from "@/components/FlyerForm";
import AiFlyerForm from "@/components/AiFlyerForm";
import FlyerPreview from "@/components/FlyerPreview";
import FlyerExamples from "@/components/FlyerExamples";
import { useState } from "react";
import { GeneratedFlyer } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Palette } from "lucide-react";

export default function Home() {
  const [generatedFlyer, setGeneratedFlyer] = useState<GeneratedFlyer | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("ai");

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex-grow">
        <section className="mb-16">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3 gradient-text">
              AI Flyer Designer
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Generate stunning, professional-quality flyers with just a text prompt. 
              Powered by cutting-edge AI to create designs that stand out.
            </p>
          </div>
          
          <div className="glass-panel p-8 mb-12">
            <Tabs defaultValue="ai" onValueChange={setActiveTab} className="w-full">
              <TabsList className="pill-nav mx-auto mb-8 p-1.5">
                <TabsTrigger 
                  value="ai" 
                  className="rounded-full flex items-center"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  AI Designer
                </TabsTrigger>
                <TabsTrigger 
                  value="template" 
                  className="rounded-full flex items-center"
                >
                  <Palette className="h-4 w-4 mr-1.5" />
                  Template Designer
                </TabsTrigger>
              </TabsList>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
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
          </div>
          
          {/* Only show examples when template tab is active */}
          {activeTab === "template" && (
            <div className="glass-panel p-8">
              <FlyerExamples />
            </div>
          )}
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
