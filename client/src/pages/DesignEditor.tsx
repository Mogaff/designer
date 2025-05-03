import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { GeneratedFlyer } from '@/lib/types';
import EnhancedDesignEditor from '@/components/EnhancedDesignEditor';
import DesignLibrary from '@/components/DesignLibrary';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Loader, 
  ImagePlus, 
  Eye,
  Settings2
} from 'lucide-react';
import meshGradient from "@assets/image-mesh-gradient (18).png";

export default function DesignEditor() {
  const [match, params] = useRoute('/editor/:id?');
  const [, setLocation] = useLocation();
  const [design, setDesign] = useState<GeneratedFlyer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const { toast } = useToast();

  // Load design if ID is provided
  useEffect(() => {
    if (match && params?.id) {
      fetchDesign(params.id);
    }
  }, [match, params]);

  // Fetch design by ID
  const fetchDesign = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await apiRequest<GeneratedFlyer>('GET', `/api/creations/${id}`);
      if (response) {
        setDesign(response);
      }
    } catch (error) {
      console.error('Failed to fetch design:', error);
      toast({
        title: "Failed to load design",
        description: "There was a problem loading the design. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle selecting a design from the library
  const handleSelectDesign = (selectedDesign: GeneratedFlyer) => {
    setDesign(selectedDesign);
    setActiveTab('editor');
    
    // Update URL if the design has an ID
    if (selectedDesign.id) {
      setLocation(`/editor/${selectedDesign.id}`, { replace: true });
    }
  };

  // Create a new blank design
  const handleCreateNewDesign = () => {
    // Default blank design
    const newDesign: GeneratedFlyer = {
      imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', // Transparent 1x1 pixel
      headline: 'New Design',
      content: 'Start editing your design',
      stylePrompt: 'minimal',
      template: 'blank'
    };
    
    setDesign(newDesign);
    setActiveTab('editor');
    setLocation('/editor', { replace: true });
  };

  return (
    <div className="flex flex-col min-h-screen overflow-hidden relative">
      {/* Background gradient image */}
      <div className="absolute inset-0 z-0">
        <img src={meshGradient} alt="" className="w-full h-full object-cover opacity-90" />
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
      </div>
      
      {/* Header */}
      <header className="relative z-10 bg-black/20 backdrop-blur-md border-b border-white/10 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-white">
              {design ? (design.name || 'Untitled Design') : 'Design Editor'}
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white bg-white/10 hover:bg-white/20"
              onClick={() => setActiveTab('library')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Library
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-white bg-white/10 hover:bg-white/20"
              onClick={handleCreateNewDesign}
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              New Design
            </Button>
            
            <Button
              variant={activeTab === 'settings' ? 'default' : 'ghost'}
              size="icon"
              className={activeTab === 'settings' ? '' : 'text-white bg-white/10 hover:bg-white/20'}
              onClick={() => setActiveTab(activeTab === 'settings' ? 'editor' : 'settings')}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main content area */}
      <main className="flex-grow relative z-10 p-4">
        <div className="container mx-auto h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsContent value="editor" className="m-0 h-full">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader className="h-8 w-8 animate-spin text-white" />
                  <span className="ml-2 text-white">Loading design...</span>
                </div>
              ) : design ? (
                <EnhancedDesignEditor
                  generatedFlyer={design}
                  isGenerating={false}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-6 bg-black/30 backdrop-blur-md rounded-lg border border-white/10 p-8">
                  <h2 className="text-2xl font-bold text-white">Welcome to the Design Editor</h2>
                  <p className="text-white/70 text-center max-w-md">
                    Create a new design or select one from your library to get started.
                  </p>
                  <div className="flex space-x-4">
                    <Button
                      size="lg"
                      onClick={handleCreateNewDesign}
                    >
                      <ImagePlus className="h-5 w-5 mr-2" />
                      Create New Design
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setActiveTab('library')}
                    >
                      <Eye className="h-5 w-5 mr-2" />
                      Browse Library
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="library" className="m-0 h-full">
              <div className="h-full bg-black/30 backdrop-blur-md rounded-lg border border-white/10 p-6 overflow-y-auto">
                <DesignLibrary
                  onSelectDesign={handleSelectDesign}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="m-0 h-full">
              <div className="h-full bg-black/30 backdrop-blur-md rounded-lg border border-white/10 p-6 overflow-y-auto">
                <h2 className="text-xl font-bold text-white mb-4">Editor Settings</h2>
                <div className="text-white/70">
                  <p>Editor settings will be available in a future update.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}