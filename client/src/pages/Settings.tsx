import { useState } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useUserSettings } from "@/contexts/UserSettingsContext";
import FontSelector from "@/components/FontSelector";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FontSettings } from "@/lib/types";

export default function Settings() {
  const { fontSettings, setFontSettings, resetFontSettings } = useUserSettings();
  const [fonts, setFonts] = useState<FontSettings>(fontSettings);
  const { toast } = useToast();

  const handleSaveSettings = () => {
    setFontSettings(fonts);
    toast({
      title: "Settings saved",
      description: "Your font preferences have been saved.",
    });
  };

  const handleReset = () => {
    resetFontSettings();
    setFonts(fontSettings);
    toast({
      title: "Settings reset",
      description: "Your font preferences have been reset to default.",
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto pt-12 px-4 lg:px-6 flex-grow">
        <div className="glass-panel p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-white mb-6">Font Settings</h1>
          
          <div className="space-y-6">
            <div className="p-4 bg-white/5 backdrop-blur-sm rounded-lg">
              <h2 className="text-lg font-semibold text-white mb-4">Customize Fonts</h2>
              <p className="text-sm text-white/70 mb-4">
                Select fonts for your designs. These fonts will be applied to new designs you create.
              </p>
              
              <FontSelector
                value={fonts}
                onChange={setFonts}
              />
            </div>
            
            <div className="flex space-x-3 justify-end">
              <Button 
                variant="outline" 
                onClick={handleReset}
                className="bg-transparent border-white/20 text-white/70 hover:bg-white/10"
              >
                Reset to Default
              </Button>
              <Button 
                onClick={handleSaveSettings}
                className="bg-gradient-to-r from-coral-400 to-coral-500 hover:from-coral-500 hover:to-coral-600 border-0"
              >
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}