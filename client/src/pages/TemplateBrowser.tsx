import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  placeholders: string[];
  features: {
    glassMorphism: boolean;
    neonEffects: boolean;
    animations: boolean;
    gradient: boolean;
  };
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
}

interface BrandKit {
  id: number;
  name: string;
  logo?: string;
  primaryColor: string;
  secondaryColor?: string;
  fontFamily: string;
  isActive: boolean;
}

export default function TemplateBrowser() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedBrandKit, setSelectedBrandKit] = useState<string>('');
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const { toast } = useToast();

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/templates/categories'],
    queryFn: async () => {
      const response = await fetch('/api/templates/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/templates', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory 
        ? `/api/templates?category=${selectedCategory}`
        : '/api/templates';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  const { data: brandKitsData } = useQuery({
    queryKey: ['/api/brand-kits'],
    queryFn: async () => {
      const response = await fetch('/api/brand-kits');
      if (!response.ok) throw new Error('Failed to fetch brand kits');
      return response.json();
    }
  });

  const generateMutation = useMutation({
    mutationFn: async ({ 
      templateId, 
      prompt, 
      brandKitId 
    }: { 
      templateId: string; 
      prompt: string; 
      brandKitId?: string;
    }) => {
      const payload: any = { prompt };
      if (brandKitId) payload.brand_kit_id = brandKitId;
      
      const response = await fetch(`/api/templates/${templateId}/generate`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to generate template');
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedHtml(data.html_content);
      toast({
        title: "Template Generated",
        description: "Your design has been created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate template",
        variant: "destructive",
      });
    }
  });

  const categories = categoriesData?.categories || [];
  const templates = templatesData?.templates || [];
  const brandKits = brandKitsData?.brandKits || [];

  const handleGenerate = () => {
    if (!selectedTemplate || !prompt.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a template and enter a prompt",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({
      templateId: selectedTemplate.id,
      prompt: prompt.trim(),
      brandKitId: selectedBrandKit && selectedBrandKit !== 'none' ? selectedBrandKit : undefined
    });
  };

  const renderFeatureBadges = (features: Template['features']) => {
    const badges = [];
    if (features.glassMorphism) badges.push(<Badge key="glass" variant="secondary">Glass Morphism</Badge>);
    if (features.neonEffects) badges.push(<Badge key="neon" variant="outline">Neon Effects</Badge>);
    if (features.animations) badges.push(<Badge key="anim" variant="default">Animations</Badge>);
    if (features.gradient) badges.push(<Badge key="grad" variant="secondary">Gradients</Badge>);
    return badges;
  };

  return (
    <div className="min-h-screen relative bg-black">
      {/* Glass blur background matching dashboard exactly */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-white">
              Template Library
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Choose from our curated collection of professional templates powered by Tailwind CSS, DaisyUI, and Flowbite
            </p>
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
            <TabsList className="grid w-full grid-cols-6 bg-black/30 backdrop-blur-md border border-white/10">
              <TabsTrigger value="" className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">All Templates</TabsTrigger>
              {categories.map((category: TemplateCategory) => (
                <TabsTrigger key={category.id} value={category.id} className="text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template: Template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer bg-black/30 backdrop-blur-md border border-white/10">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg text-white">{template.name}</CardTitle>
                          <CardDescription className="mt-1 text-white/70">
                            {template.description}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-white/10 text-white border-white/20">{template.category}</Badge>
                      </div>
                    </CardHeader>
                    
                    {/* Template Preview */}
                    <div className="px-6 mb-4">
                      <div className="w-full h-40 bg-black/20 rounded-lg overflow-hidden border border-white/20">
                        <iframe 
                          src={`/api/templates/${encodeURIComponent(template.id)}/preview`}
                          title={`${template.name} preview`}
                          className="w-full h-full border-0"
                          style={{ 
                            pointerEvents: 'none',
                            background: '#f8fafc'
                          }}
                          loading="lazy"
                        />
                      </div>
                    </div>
                    
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {renderFeatureBadges(template.features)}
                        </div>
                        
                        <div className="text-sm text-white/60">
                          <span className="font-medium">Placeholders:</span> {template.placeholders.length} fields
                        </div>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              className="w-full bg-white text-black hover:bg-white/90 font-medium"
                              onClick={() => setSelectedTemplate(template)}
                            >
                              Use Template
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl bg-black/90 backdrop-blur-md border border-white/10">
                            <DialogHeader>
                              <DialogTitle className="text-white">Generate with {template.name}</DialogTitle>
                              <DialogDescription className="text-white/70">
                                Enter your prompt and customize the template with your content
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4 mt-4">
                              <div>
                                <Label htmlFor="prompt" className="text-white">Content Prompt</Label>
                                <Textarea
                                  id="prompt"
                                  placeholder="Describe what you want to create... (e.g., 'A summer music festival flyer for electronic music')"
                                  value={prompt}
                                  onChange={(e) => setPrompt(e.target.value)}
                                  rows={4}
                                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                />
                              </div>

                              {brandKits.length > 0 && (
                                <div>
                                  <Label htmlFor="brandKit" className="text-white">Brand Kit (Optional)</Label>
                                  <Select value={selectedBrandKit} onValueChange={setSelectedBrandKit}>
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                      <SelectValue placeholder="Choose a brand kit" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-black/90 border-white/20">
                                      <SelectItem value="none" className="text-white">No brand kit</SelectItem>
                                      {brandKits.map((kit: BrandKit) => (
                                        <SelectItem key={kit.id} value={kit.id.toString()} className="text-white">
                                          {kit.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              <div className="bg-white/10 p-4 rounded-lg border border-white/20">
                                <h4 className="font-medium mb-2 text-white">Template Fields:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {template.placeholders.map((placeholder) => (
                                    <Badge key={placeholder} variant="outline" className="text-xs bg-white/10 text-white border-white/20">
                                      {placeholder}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <Button 
                                onClick={handleGenerate}
                                disabled={generateMutation.isPending}
                                className="w-full bg-white text-black hover:bg-white/90 font-medium"
                              >
                                {generateMutation.isPending ? 'Generating...' : 'Generate Design'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {generatedHtml && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 text-white">Generated Design</h2>
              <div className="bg-black/30 backdrop-blur-md p-4 rounded-lg border border-white/10">
                <iframe
                  srcDoc={generatedHtml}
                  className="w-full h-96 border rounded border-white/20"
                  title="Generated Template"
                />
              </div>
              <div className="mt-4 flex gap-4">
                <Button 
                  onClick={() => {
                    const blob = new Blob([generatedHtml], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'generated-design.html';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="bg-white text-black hover:bg-white/90 font-medium"
                >
                  Download HTML
                </Button>
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Generate PNG
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}