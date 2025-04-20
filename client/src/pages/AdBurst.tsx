import { useState, useRef } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { FileVideo, Download, Upload, Share2, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (selectedFiles.length !== 3) {
      toast({
        title: "Error",
        description: "Please select exactly 3 product images.",
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
    
    if (files.length !== 3) {
      toast({
        title: "Error",
        description: "Please select exactly 3 product images.",
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
      
      // Append the three image files with specific keys as expected by the server
      formData.append('image1', files[0]);
      formData.append('image2', files[1]);
      formData.append('image3', files[2]);
      
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
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-white">AdBurst Factory</h1>
          <p className="text-lg text-white/70 mb-8">
            Generate 8-second vertical ads from your product images using AI
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className="bg-slate-900/50 border-slate-800 text-white backdrop-blur-md">
                <CardHeader>
                  <CardTitle>Upload Your Product Images</CardTitle>
                  <CardDescription className="text-slate-400">
                    Select exactly 3 product images to create your ad video
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="file-upload">Product Images (exactly 3)</Label>
                        <div 
                          className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:bg-slate-800/50 transition-colors cursor-pointer"
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
                          <Upload className="h-10 w-10 mx-auto mb-2 text-slate-500" />
                          <p className="text-sm text-slate-400">
                            Drag and drop your images here, or click to browse
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            PNG, JPG, or WEBP (Max 10MB each)
                          </p>
                        </div>
                        
                        {files.length > 0 && (
                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                              <h3 className="text-sm font-medium">Selected Images ({files.length}/3)</h3>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm"
                                onClick={clearFiles}
                                disabled={loading}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Clear All
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                              {files.map((file, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={`Preview ${index + 1}`}
                                    className="h-24 w-full object-cover rounded-md"
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
                      
                      <div className="space-y-2">
                        <Label htmlFor="prompt">Product Description (optional)</Label>
                        <Textarea
                          id="prompt"
                          placeholder="Describe your product and target audience..."
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          disabled={loading}
                          className="bg-slate-800/50 border-slate-700 focus:border-indigo-600"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="callToAction">Call to Action (optional)</Label>
                        <Input
                          id="callToAction"
                          placeholder="e.g., 'Shop Now', 'Learn More'"
                          value={callToAction}
                          onChange={(e) => setCallToAction(e.target.value)}
                          disabled={loading}
                          className="bg-slate-800/50 border-slate-700 focus:border-indigo-600"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                        <Select
                          value={aspectRatio}
                          onValueChange={setAspectRatio}
                          disabled={loading}
                        >
                          <SelectTrigger className="bg-slate-800/50 border-slate-700 focus:border-indigo-600">
                            <SelectValue placeholder="Select aspect ratio" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vertical">Vertical (9:16) - For Stories/Reels</SelectItem>
                            <SelectItem value="square">Square (1:1) - For Instagram Feed</SelectItem>
                            <SelectItem value="horizontal">Horizontal (16:9) - For YouTube</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {loading && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Processing...</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}
                      
                      <Button
                        type="submit"
                        disabled={loading || files.length !== 3}
                        className="w-full"
                      >
                        <FileVideo className="h-4 w-4 mr-2" />
                        {loading ? 'Generating Ad...' : 'Generate Ad Video'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card className="bg-slate-900/50 border-slate-800 text-white backdrop-blur-md">
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-600/20 rounded-full p-2 text-indigo-400">
                        <span className="font-bold">1</span>
                      </div>
                      <div>
                        <h3 className="font-medium">Upload Images</h3>
                        <p className="text-sm text-slate-400">Select exactly 3 product images</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-600/20 rounded-full p-2 text-indigo-400">
                        <span className="font-bold">2</span>
                      </div>
                      <div>
                        <h3 className="font-medium">AI Processing</h3>
                        <p className="text-sm text-slate-400">We use Gemini Veo 2, GPT-4o, and ElevenLabs</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-600/20 rounded-full p-2 text-indigo-400">
                        <span className="font-bold">3</span>
                      </div>
                      <div>
                        <h3 className="font-medium">Get Your Ad</h3>
                        <p className="text-sm text-slate-400">Download your 8-second vertical ad video</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="bg-indigo-600/20 rounded-full p-2 text-indigo-400">
                        <span className="font-bold">4</span>
                      </div>
                      <div>
                        <h3 className="font-medium">Share on Social</h3>
                        <p className="text-sm text-slate-400">Your video is ready to share via Buffer</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {result && result.success && (
                <Card className="bg-slate-900/50 border-slate-800 text-white backdrop-blur-md mt-6">
                  <CardHeader>
                    <CardTitle>Your Ad Is Ready!</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.videoUrl && (
                      <div className="mb-4">
                        <video 
                          src={result.videoUrl} 
                          controls 
                          className="w-full rounded-md bg-black"
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )}
                    
                    {result.script && (
                      <div className="p-3 bg-slate-800 rounded-md mb-4">
                        <h3 className="text-sm font-medium text-slate-300 mb-1">Ad Script:</h3>
                        <p className="text-sm text-white/70 italic">"{result.script}"</p>
                      </div>
                    )}
                    
                    <Button
                      className="w-full"
                      onClick={() => window.open(result.videoUrl, '_blank')}
                      disabled={!result.videoUrl}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Video
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        // Reset the form and result
                        setResult(null);
                        setFiles([]);
                        setPrompt('');
                        setCallToAction('');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Create New Ad
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}