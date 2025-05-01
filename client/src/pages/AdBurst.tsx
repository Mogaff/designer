import { useState, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { FileVideo, Download, Upload, Share2, Trash2, ImageIcon, PaintBucket, Check, WandSparkles, Video } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { BrandKit } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdBurstResponse {
  success: boolean;
  message: string;
  videoUrl?: string;
  script?: string;
  error?: string;
}

export default function AdBurst() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [callToAction, setCallToAction] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('vertical');
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<AdBurstResponse | null>(null);
  const [activeTab, setActiveTab] = useState<string>("create");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get active brand kit for styling consistency with design dashboard
  const { data: activeBrandKitData } = useQuery<{ brandKit: BrandKit }>({
    queryKey: ['/api/brand-kits/active'],
    refetchOnWindowFocus: false,
  });
  
  const activeBrandKit = activeBrandKitData?.brandKit;

  // Function to handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length < 3 || selectedFiles.length > 5) {
      toast({
        title: "Error",
        description: "Please select 3-5 product images.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file types (only images)
    const invalidFiles = selectedFiles.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload only image files.",
        variant: "destructive"
      });
      return;
    }
    
    setFiles(selectedFiles);
  };

  // Function to remove a file
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Function to clear all files
  const clearFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length < 3 || files.length > 5) {
      toast({
        title: "Error",
        description: "Please select 3-5 product images.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setProgress(0);
    
    try {
      // Create FormData object
      const formData = new FormData();
      
      console.log('Preparing form data for submission...');
      
      // Append image files with proper indices
      files.forEach((file, index) => {
        formData.append(`image${index + 1}`, file);
      });
      
      console.log('Files attached:', files.map(f => f.name).join(', '));
      
      // Extract product name from prompt (first few words)
      const productName = prompt.split(' ').slice(0, 3).join(' ') || 'Product';
      formData.append('productName', productName);
      
      console.log('Product name set to:', productName);
      
      // Additional optional fields
      formData.append('productDescription', prompt || '');
      console.log('Product description:', prompt || '(none)');
      
      if (callToAction) {
        formData.append('targetAudience', callToAction);
        console.log('Target audience:', callToAction);
      }
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 5;
        });
      }, 1000);
      
      // Make the API request
      const response = await fetch('/api/adburst', {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      
      const responseData = await response.json();
      
      if (responseData && responseData.success) {
        setResult(responseData as AdBurstResponse);
        toast({
          title: "Success!",
          description: "Your ad video has been generated successfully.",
        });
      } else {
        throw new Error(responseData && responseData.message ? 
          responseData.message : 'Failed to generate ad video');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to generate ad video',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-grow h-full max-h-full overflow-hidden">
      {/* Main Dashboard-Style Layout with Split View */}
      <div className="flex h-full overflow-hidden">
        {/* Left Sidebar - Form Panel */}
        <div className="w-[280px] min-w-[280px] border-r border-white/10 flex flex-col overflow-auto p-3 bg-black/20">
          <div className="mb-2">
            <h2 className="text-base font-semibold text-white">Create Video Ad</h2>
          </div>
          
          {/* Brand Kit Badge */}
          {activeBrandKit && (
            <div className="mb-3 p-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 h-8 w-8 rounded bg-white/10 p-1 flex items-center justify-center overflow-hidden">
                  {activeBrandKit.logo_url ? (
                    <img src={activeBrandKit.logo_url} alt="Brand Logo" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <PaintBucket className="h-4 w-4 text-indigo-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-white truncate">{activeBrandKit.name}</h3>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                      <Check className="mr-1 h-3 w-3" />
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-white/60 truncate">Using brand colors and style</p>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-xs text-white/70 mb-4">
            AdBurst Factory creates engaging 8-20 second video ads from your product images using AI. Perfect for Instagram Reels and TikTok.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Main content area */}
            <div className="space-y-5">
              {/* Image upload section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="file-upload" className="text-sm font-medium text-white">Product Images (3-5 images)</Label>
                  {files.length > 0 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={clearFiles}
                      disabled={loading}
                      className="h-7 px-2 text-xs text-white/70 hover:text-white"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                
                <div 
                  className="border border-dashed border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-lg p-4 text-center transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                  
                  <div className="flex flex-col items-center justify-center py-4">
                    <ImageIcon className="h-8 w-8 text-indigo-400 mb-2" />
                    <p className="text-sm font-medium text-white mb-1">
                      Upload product images
                    </p>
                    <p className="text-xs text-white/60">
                      Select 3-5 high-quality product images
                    </p>
                  </div>
                </div>
                
                {files.length > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-medium text-white/80">Selected Images ({files.length}/5)</h3>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {files.map((file, index) => (
                        <div key={index} className="relative group rounded-md overflow-hidden border border-indigo-500/20">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="h-16 w-full object-cover"
                          />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-black/50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeFile(index)}
                            disabled={loading}
                          >
                            <Trash2 className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <Separator className="bg-white/10" />
              
              {/* Product Info Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt" className="text-sm font-medium text-white">Product Description</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe your product, its key features, and target audience..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={loading}
                    className="bg-black/20 border-white/10 focus:border-indigo-500 text-white min-h-[80px]"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="callToAction" className="text-sm font-medium text-white">Call to Action</Label>
                    <Input
                      id="callToAction"
                      placeholder="e.g., 'Shop Now', 'Learn More'"
                      value={callToAction}
                      onChange={(e) => setCallToAction(e.target.value)}
                      disabled={loading}
                      className="bg-black/20 border-white/10 focus:border-indigo-500 text-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="aspectRatio" className="text-sm font-medium text-white">Aspect Ratio</Label>
                    <Select
                      value={aspectRatio}
                      onValueChange={setAspectRatio}
                      disabled={loading}
                    >
                      <SelectTrigger className="bg-black/20 border-white/10 focus:border-indigo-500 text-white">
                        <SelectValue placeholder="Select ratio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vertical">Vertical (9:16) - Stories/Reels</SelectItem>
                        <SelectItem value="square">Square (1:1) - Feed</SelectItem>
                        <SelectItem value="horizontal">Horizontal (16:9) - YouTube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <Separator className="bg-white/10" />
              
              {/* Processing indicator */}
              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white/70">
                    <span>Processing video...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
              
              {/* Generate button */}
              <Button
                type="submit"
                disabled={loading || files.length < 3}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white"
                size="lg"
              >
                <WandSparkles className="h-4 w-4 mr-2" />
                {loading ? 'Processing Video...' : 'Generate Video Ad'}
              </Button>
              
              <div className="text-center text-xs text-white/60">
                Using 1 credit to generate a professional-quality video ad
              </div>
            </div>
          </form>
        </div>
        
        {/* Main Content Area - Preview */}
        <div className="flex-1 relative overflow-hidden">
          {/* Tab Controls - Based on Home page TabsList */}
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="h-full relative"
          >
            {/* Tab Controls */}
            <div className="absolute top-2 left-2 z-20 scale-75 origin-top-left">
              <TabsList className="relative backdrop-blur-sm bg-white/10 border border-white/10 shadow rounded-full h-5 p-0.5 flex items-center overflow-hidden">
                <div 
                  className={`absolute inset-y-0.5 transition-all duration-200 rounded-full bg-white/20 backdrop-blur-sm ${activeTab === 'create' ? 'left-0.5 right-[calc(50%_+_0.5px)]' : 'left-[calc(50%_+_0.5px)] right-0.5'}`}
                  style={{
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)',
                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                ></div>
                <TabsTrigger 
                  value="create" 
                  className="z-10 text-[10px] px-3 h-4 flex-1 text-white data-[state=active]:text-white data-[state=active]:shadow-none relative overflow-hidden"
                >
                  <span className="relative z-10">Create</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="preview" 
                  className="z-10 text-[10px] px-3 h-4 flex-1 text-white data-[state=active]:text-white data-[state=active]:shadow-none relative overflow-hidden"
                >
                  <span className="relative z-10">Preview</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Create Tab Content - Empty Space */}
            <TabsContent value="create" className="h-full m-0 p-0 flex items-center justify-center data-[state=inactive]:hidden data-[state=active]:flex">
              {!result && (
                <div className="text-center text-white/50">
                  <Video className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">Create your video ad</p>
                  <p className="text-sm mt-2 max-w-md mx-auto">Fill out the form on the left and click Generate to create your AI-powered video advertisement</p>
                </div>
              )}
              
              {/* Results Display (when available) */}
              {result && result.success && (
                <div className="space-y-8 max-w-md">
                  <div className="text-xl font-medium text-white text-center">
                    Your Video Ad is Ready!
                  </div>
                  
                  <div className="aspect-[9/16] w-[280px] mx-auto bg-black rounded-lg overflow-hidden shadow-xl">
                    {result.videoUrl && (
                      <video 
                        src={result.videoUrl} 
                        controls 
                        className="w-full h-full"
                        autoPlay
                        loop
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                  
                  <div className="flex justify-center gap-4 mt-6">
                    {result.videoUrl && (
                      <Button
                        size="default"
                        className="px-6"
                        onClick={() => window.open(result.videoUrl, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="default"
                      className="px-6"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share to Socials
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Preview Tab Content */}
            <TabsContent value="preview" className="h-full m-0 p-0 data-[state=inactive]:hidden data-[state=active]:block">
              {result && result.success && result.script && (
                <div className="p-6 h-full flex flex-col">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-white mb-2">Generated Script</h3>
                    <div className="p-4 bg-black/20 rounded-md border border-white/10 text-white/90">
                      <p className="whitespace-pre-line">{result.script}</p>
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <h3 className="text-lg font-medium text-white mb-2">Video Details</h3>
                    <div className="p-4 bg-black/20 rounded-md border border-white/10 text-white/90">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-white/50 mb-1">Format</p>
                          <p className="text-sm">{aspectRatio === 'vertical' ? 'Vertical (9:16)' : 
                                                  aspectRatio === 'square' ? 'Square (1:1)' : 
                                                  'Horizontal (16:9)'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-white/50 mb-1">Duration</p>
                          <p className="text-sm">~20 seconds</p>
                        </div>
                        <div>
                          <p className="text-sm text-white/50 mb-1">Model</p>
                          <p className="text-sm">Fal AI + Claude</p>
                        </div>
                        <div>
                          <p className="text-sm text-white/50 mb-1">Images Used</p>
                          <p className="text-sm">{files.length} images</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {(!result || !result.success) && (
                <div className="flex items-center justify-center h-full text-white/50">
                  <div className="text-center">
                    <p className="text-lg font-medium">No video generated yet</p>
                    <p className="text-sm mt-2">Generate a video first to see details</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
    </div>
  );
}