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
    generatedWithAI?: boolean;
  };
}

export default function AdBurst() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [callToAction, setCallToAction] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('vertical');
  const [videoDuration, setVideoDuration] = useState<number>(30);
  const [useAiImages, setUseAiImages] = useState<boolean>(false);
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

  // Calculate required images based on video duration
  const getImageRequirements = (duration: number) => {
    if (duration <= 15) return { min: 3, max: 4, recommended: 3 };
    if (duration <= 30) return { min: 5, max: 6, recommended: 5 };
    if (duration <= 45) return { min: 7, max: 8, recommended: 7 };
    return { min: 8, max: 12, recommended: 10 };
  };

  const imageRequirements = getImageRequirements(videoDuration);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Limit to dynamic maximum based on duration
      if (selectedFiles.length + files.length > imageRequirements.max) {
        toast({
          title: "Maximum files exceeded",
          description: `You can only upload up to ${imageRequirements.max} images for ${videoDuration}-second video`,
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
    
    // Validate based on selected mode
    if (!useAiImages && files.length < imageRequirements.min) {
      toast({
        title: "Not enough images",
        description: `Please upload at least ${imageRequirements.min} images for ${videoDuration}-second video`,
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setProgress(0);
    
    const formData = new FormData();
    
    // Add product information
    const productName = 'Product';  // Default product name
    formData.append('productName', productName);
    formData.append('productDescription', prompt);
    formData.append('targetAudience', callToAction);
    formData.append('videoDuration', videoDuration.toString());
    formData.append('useAiImages', useAiImages.toString());
    
    // Add uploaded files if not using AI generation
    if (!useAiImages) {
      files.forEach((file, index) => {
        formData.append(`image${index + 1}`, file);
      });
    }
    
    try {
      // Set up progress monitoring
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (Math.random() * 5);
          return newProgress >= 95 ? 95 : newProgress;
        });
      }, 1000);
      
      const response = await fetch('/api/adburst/enhanced', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      if (response.ok) {
        const data = await response.json();
        setProgress(100);
        setResult(data);
        toast({
          title: "Video generated successfully!",
          description: "Your ad video is ready to download and share",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate video');
      }
    } catch (error) {
      console.error('Error generating video:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if form is valid for submission
  const isFormValid = useAiImages || files.length >= imageRequirements.min;

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
          AdBurst Factory creates engaging 15-60 second video ads from your images or AI-generated visuals. Perfect for social media platforms.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-5">
            {/* Video Duration Selection */}
            <div className="space-y-2">
              <Label htmlFor="videoDuration" className="text-sm font-medium text-white">Video Duration</Label>
              <Select
                value={videoDuration.toString()}
                onValueChange={(value) => setVideoDuration(parseInt(value))}
                disabled={loading}
              >
                <SelectTrigger className="bg-white/10 border-white/10 focus:border-indigo-500 text-white backdrop-blur-sm h-9">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 seconds ({getImageRequirements(15).min}-{getImageRequirements(15).max} images)</SelectItem>
                  <SelectItem value="30">30 seconds ({getImageRequirements(30).min}-{getImageRequirements(30).max} images)</SelectItem>
                  <SelectItem value="45">45 seconds ({getImageRequirements(45).min}-{getImageRequirements(45).max} images)</SelectItem>
                  <SelectItem value="60">60 seconds ({getImageRequirements(60).min}-{getImageRequirements(60).max} images)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Image Source Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-white">Image Source</Label>
              <div className="space-y-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="imageSource"
                    checked={!useAiImages}
                    onChange={() => {
                      setUseAiImages(false);
                    }}
                    disabled={loading}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-white">Upload my own images</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="imageSource"
                    checked={useAiImages}
                    onChange={() => {
                      setUseAiImages(true);
                      setFiles([]); // Clear uploaded files when switching to AI mode
                    }}
                    disabled={loading}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-white">Generate images with AI based on product story</span>
                </label>
              </div>
            </div>

            {/* Image upload section - only show if not using AI */}
            {!useAiImages && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="file-upload" className="text-sm font-medium text-white">
                    Product Images ({imageRequirements.min}-{imageRequirements.max} images)
                  </Label>
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
                      Select {imageRequirements.min}-{imageRequirements.max} high-quality product images
                    </p>
                  </div>
                </div>
                
                {files.length > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-medium text-white/80">Selected Images ({files.length}/{imageRequirements.max})</h3>
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
            )}
            
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
              disabled={loading || !isFormValid}
              className="w-full bg-indigo-500/40 hover:bg-indigo-500/60 backdrop-blur-md text-white border border-indigo-500/40 shadow-md transition-all"
              size="default"
            >
              <WandSparkles className="h-4 w-4 mr-2" />
              {loading ? `Processing ${videoDuration}s Video...` : `Generate ${videoDuration}s Video Ad`}
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
              Your {videoDuration}s Ad Video is Ready!
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
                            <p className="text-white/50">Images</p>
                            <p className="text-white/80">{result.metadata.generatedWithAI ? 'AI Generated' : 'User Uploaded'}</p>
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
              <p>Choose your video duration ({videoDuration}s), then either upload {imageRequirements.min}-{imageRequirements.max} product images or use AI to generate them from your product description.</p>
              <p className="text-sm">AI will create a professional script and video based on your inputs!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}