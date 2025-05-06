import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useUserSettings } from "@/contexts/UserSettingsContext";
import FontSelector from "@/components/FontSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FontSettings } from "@/lib/types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const { fontSettings, setFontSettings, resetFontSettings } = useUserSettings();
  const [fonts, setFonts] = useState<FontSettings>(fontSettings);
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [googleCseId, setGoogleCseId] = useState('');
  const [activeTab, setActiveTab] = useState('fonts');
  const { toast } = useToast();

  // Query to check if Google Search API is configured
  const googleSearchStatusQuery = useQuery<{ configured: boolean }>({
    queryKey: ['/api/ad-inspiration/google-search-status'],
    refetchOnWindowFocus: false,
  });

  // Mutation for saving Google Search API settings
  const saveGoogleSearchMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/ad-inspiration/configure-google-search', {
        apiKey: googleApiKey,
        cseId: googleCseId
      });
    },
    onSuccess: () => {
      toast({
        title: "API Settings Saved",
        description: "Google Custom Search API settings have been saved.",
      });
      // Refetch status to update UI
      googleSearchStatusQuery.refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save API settings: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation for testing Google Search API
  const testGoogleSearchMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('GET', '/api/ad-inspiration/test-google-search', null);
    },
    onSuccess: (data) => {
      toast({
        title: "API Test Successful",
        description: `Found ${data.count} results from Google Search API.`,
      });
    },
    onError: (error) => {
      toast({
        title: "API Test Failed",
        description: `Failed to test Google Search API: ${error.message}`,
        variant: "destructive",
      });
    }
  });

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
  
  const handleSaveGoogleSearchSettings = () => {
    if (!googleApiKey || !googleCseId) {
      toast({
        title: "Missing information",
        description: "Please enter both Google API Key and Custom Search Engine ID.",
        variant: "destructive",
      });
      return;
    }
    
    saveGoogleSearchMutation.mutate();
  };
  
  const handleTestGoogleSearch = () => {
    // Check if Google Search API is configured
    if (!(googleSearchStatusQuery.isSuccess && (googleSearchStatusQuery.data as any)?.configured)) {
      toast({
        title: "API Not Configured",
        description: "Please save your Google Custom Search API settings first.",
        variant: "destructive",
      });
      return;
    }
    
    testGoogleSearchMutation.mutate();
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto pt-12 px-4 lg:px-6 flex-grow">
        <div className="glass-panel p-6 rounded-lg">
          <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger 
                value="fonts" 
                className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                Font Settings
              </TabsTrigger>
              <TabsTrigger 
                value="api" 
                className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
              >
                API Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="fonts" className="space-y-6">
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
            </TabsContent>
            
            <TabsContent value="api" className="space-y-6">
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Google Custom Search API Settings</CardTitle>
                  <CardDescription className="text-white/70">
                    These settings are required for the Ad Inspiration feature to search for Google ads without using browser automation.
                    Follow these steps:
                  </CardDescription>
                  <div className="mt-3 text-xs text-white/70 space-y-1">
                    <p>1. Create a Google Cloud project at <a href="https://console.cloud.google.com" target="_blank" className="text-blue-400 hover:underline">Google Cloud Console</a></p>
                    <p>2. Enable the "Custom Search API" in the Google Cloud Console</p>
                    <p>3. Create an API key in the Credentials section</p>
                    <p>4. Create a Custom Search Engine at <a href="https://programmablesearchengine.google.com/cse/all" target="_blank" className="text-blue-400 hover:underline">Programmable Search Engine</a></p>
                    <p>5. Get your Search Engine ID (look for "cx" parameter)</p>
                    <p>6. Enter both values below and save</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-white/70">Google API Key</label>
                    <Input
                      type="password"
                      value={googleApiKey}
                      onChange={(e) => setGoogleApiKey(e.target.value)}
                      placeholder="Enter your Google API Key"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                    <p className="text-xs text-white/50">
                      Create a key in the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-400 hover:underline">Google Cloud Console</a>
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-white/70">Custom Search Engine ID</label>
                    <Input
                      value={googleCseId}
                      onChange={(e) => setGoogleCseId(e.target.value)}
                      placeholder="Enter your Custom Search Engine ID"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                    <p className="text-xs text-white/50">
                      Create a CSE at <a href="https://programmablesearchengine.google.com/cse/all" target="_blank" className="text-blue-400 hover:underline">Programmable Search Engine</a>
                    </p>
                  </div>
                  
                  {googleSearchStatusQuery.isSuccess && (googleSearchStatusQuery.data as any)?.configured && (
                    <div className="mt-2 p-2 bg-green-500/20 border border-green-500/30 rounded text-sm text-white">
                      ✓ Google Custom Search API is configured
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between border-t border-white/10 pt-4">
                  <div>
                    {googleSearchStatusQuery.isSuccess && (googleSearchStatusQuery.data as any)?.configured && (
                      <Button 
                        variant="outline"
                        onClick={handleTestGoogleSearch}
                        disabled={testGoogleSearchMutation.isPending}
                        className="bg-transparent border-white/20 text-white/70 hover:bg-white/10"
                      >
                        {testGoogleSearchMutation.isPending ? 'Testing...' : 'Test API Connection'}
                      </Button>
                    )}
                  </div>
                  <Button 
                    onClick={handleSaveGoogleSearchSettings}
                    disabled={saveGoogleSearchMutation.isPending}
                    className="bg-gradient-to-r from-coral-400 to-coral-500 hover:from-coral-500 hover:to-coral-600 border-0"
                  >
                    {saveGoogleSearchMutation.isPending ? 'Saving...' : 'Save API Settings'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}