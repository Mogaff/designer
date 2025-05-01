import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { FileVideo, FileText, Download, Upload, Share2, Trash2, ImageIcon, PaintBucket, Check, WandSparkles, Video } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { BrandKit } from "@/lib/types";

interface AdBurstResponse {
  success: boolean;
  message: string;
  videoUrl?: string;
  script?: string;
  metadata?: {
    productName: string;
    generatedAt: string;
    videoLength: string;
    aspectRatio: string;
    imagesUsed: number;
    scriptWordCount: number;
  };
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get active brand kit for styling consistency with design dashboard
  const { data: activeBrandKitData } = useQuery<{ brandKit: BrandKit }>({
    queryKey: ['/api/brand-kits/active'],
    refetchOnWindowFocus: false,
  });
  
  const activeBrandKit = activeBrandKitData?.brandKit;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Limit to 5 files maximum
      if (selectedFiles.length + files.length > 5) {
        toast({
          title: "Maximum files exceeded",
          description: "You can only upload up to 5 images",
          variant: "destructive"
        });
        return;
      }
      
      // Check file types
      for (const file of selectedFiles) {
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file type",
            description: "Please upload only image files",
            variant: "destructive"
          });
          return;
        }
      }
      
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };
  
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  const clearFiles = () => {
    setFiles([]);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length < 3) {
      toast({
        title: "Not enough images",
        description: "Please upload at least 3 product images",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setProgress(0);
    
    const formData = new FormData();
    
    // Log what we're sending to help debug
    console.log(`Uploading ${files.length} images`);
    
    // Backend expects images with specific field names (image1, image2, etc.)
    files.forEach((file, index) => {
      console.log(`Adding image${index + 1}: ${file.name} (${file.size} bytes)`);
      formData.append(`image${index + 1}`, file);
    });
    
    // Add product information
    const productName = 'Product';  // Default product name
    formData.append('productName', productName);
    formData.append('productDescription', prompt);
    formData.append('targetAudience', callToAction);
    formData.append('aspectRatio', aspectRatio);
    
    console.log('Form data prepared:', {
      productName,
      productDescription: prompt,
      targetAudience: callToAction,
      aspectRatio
    });
    
    try {
      // Set up progress monitoring
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (Math.random() * 5);
          return newProgress >= 95 ? 95 : newProgress;
        });
      }, 1000);
      
      console.log('Sending request to /api/adburst...');
      const response = await fetch('/api/adburst', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      console.log(`Request completed with status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Success response:', data);
        setProgress(100);
        setResult(data);
        toast({
          title: "Success!",
          description: "Your video ad has been created successfully.",
        });
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        toast({
          title: "Error",
          description: errorData.message || "Failed to generate ad video",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Exception during request:', error);
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
    <div className="flex h-full">
      {/* Sidebar Form */}
      <div className="w-[280px] h-full overflow-y-auto rounded-lg bg-white/5 backdrop-blur-lg border border-white/10 px-4 py-5 relative">
        <div className="mb-2">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Video className="h-4 w-4 text-indigo-400" />
            AI Video Studio
          </h2>
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
                className="border border-dashed border-indigo-500/40 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-lg p-4 text-center transition-colors cursor-pointer"
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
                  
                  <div className="grid grid-cols-5 gap-2">
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
                  className="bg-white/10 border-white/10 focus:border-indigo-500 text-white min-h-[80px] backdrop-blur-sm"
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
                    className="bg-white/10 border-white/10 focus:border-indigo-500 text-white backdrop-blur-sm h-9"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="aspectRatio" className="text-sm font-medium text-white">Aspect Ratio</Label>
                  <Select
                    value={aspectRatio}
                    onValueChange={setAspectRatio}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-white/10 border-white/10 focus:border-indigo-500 text-white backdrop-blur-sm h-9">
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
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
            
            {/* Generate button */}
            <Button
              type="submit"
              disabled={loading || files.length < 3}
              className="w-full bg-indigo-500/40 hover:bg-indigo-500/60 backdrop-blur-md text-white border border-indigo-500/40 shadow-md transition-all"
              size="default"
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
      
      {/* Main Content Area - Video Preview */}
      <div className="flex-1 p-6 overflow-hidden">
        {result && result.success ? (
          <div className="w-full h-full">
            <div className="text-xl font-semibold text-white flex items-center mb-4">
              <Video className="h-5 w-5 mr-2 text-indigo-400" />
              Your Ad Video is Ready!
            </div>
            
            <div className="flex flex-wrap gap-6">
              {/* Video Column */}
              <div className="flex-shrink-0">
                <div className="aspect-[9/16] w-full max-w-[300px] bg-black/30 rounded-lg overflow-hidden shadow-xl border border-white/10">
                  {result.videoUrl && (
                    <video 
                      src={result.videoUrl} 
                      controls 
                      autoPlay
                      className="w-full h-full"
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
                
                <div className="flex gap-2 mt-3">
                  {result.videoUrl && (
                    <Button
                      size="sm"
                      className="bg-indigo-500/40 hover:bg-indigo-500/60 backdrop-blur-md text-white border border-indigo-500/40 shadow-md transition-all flex-1"
                      onClick={() => window.open(result.videoUrl, '_blank')}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 hover:bg-white/15 border-white/20 text-white backdrop-blur-sm flex-1"
                  >
                    <Share2 className="h-3.5 w-3.5 mr-1.5" />
                    Share
                  </Button>
                </div>
              </div>
              
              {/* Script Column */}
              {result.script && (
                <div className="flex-1 min-w-[280px] max-w-[400px]">
                  <div className="p-4 h-full bg-white/10 backdrop-blur-sm rounded-lg overflow-y-auto border border-white/10 shadow-md">
                    <p className="font-medium mb-2 text-white text-sm flex items-center">
                      <FileText className="h-4 w-4 mr-1.5 text-indigo-400" />
                      Generated Script
                    </p>
                    <div className="max-h-[330px] overflow-y-auto pr-2">
                      <p className="text-white/80 whitespace-pre-line text-sm leading-relaxed">{result.script}</p>
                    </div>
                    
                    {/* Additional metadata */}
                    {result.metadata && (
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-xs">
                            <p className="text-white/50">Video Length</p>
                            <p className="text-white/80">{result.metadata.videoLength}</p>
                          </div>
                          <div className="text-xs">
                            <p className="text-white/50">Word Count</p>
                            <p className="text-white/80">{result.metadata.scriptWordCount} words</p>
                          </div>
                          <div className="text-xs">
                            <p className="text-white/50">Format</p>
                            <p className="text-white/80">{result.metadata.aspectRatio}</p>
                          </div>
                          <div className="text-xs">
                            <p className="text-white/50">Generated</p>
                            <p className="text-white/80">{new Date(result.metadata.generatedAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/60">
            <div className="flex flex-col items-center max-w-md text-center space-y-3">
              <Video className="h-12 w-12 mb-2 text-white/20" />
              <h3 className="text-xl font-medium text-white/90">Create Your Video Ad</h3>
              <p>Upload 3-5 product images and add a description to generate an engaging video advertisement for your product.</p>
              <p className="text-sm">AI will create a professional script and animation based on your inputs!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}