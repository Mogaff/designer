import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
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
  primary_color: string;
  secondary_color: string;
}

export default function TemplateBrowser() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedBrandKit, setSelectedBrandKit] = useState<string>('');
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const { toast } = useToast();

  // Fetch template categories
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/templates/categories'],
    queryFn: async () => {
      const response = await fetch('/api/templates/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Fetch templates
  const { data: templatesData, refetch: refetchTemplates } = useQuery({
    queryKey: ['/api/templates', selectedCategory],
    queryFn: async () => {
      const url = `/api/templates${selectedCategory ? `?category=${selectedCategory}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  // Fetch brand kits
  const { data: brandKitsData } = useQuery({
    queryKey: ['/api/brand-kits'],
    queryFn: async () => {
      const response = await fetch('/api/brand-kits');
      if (!response.ok) throw new Error('Failed to fetch brand kits');
      return response.json();
    }
  });

  // Generate template mutation
  const generateMutation = useMutation({
    mutationFn: async ({ templateId, prompt, brandKitId }: { 
      templateId: string; 
      prompt: string; 
      brandKitId?: string 
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Template Library
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose from our curated collection of professional templates powered by Tailwind CSS, DaisyUI, and Flowbite
          </p>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="">All Templates</TabsTrigger>
            {categories.map((category: TemplateCategory) => (
              <TabsTrigger key={category.id} value={category.id}>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template: Template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                  </CardHeader>
                  
                  {/* Template Preview */}
                  <div className="px-6 mb-4">
                    <div className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden border">
                      <img 
                        src={`/api/templates/${encodeURIComponent(template.id)}/preview`}
                        alt={`${template.name} preview`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNGM0Y0RjYiLz48dGV4dCB4PSIyMDAiIHk9IjE1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzZCNzI4MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5QcmV2aWV3IFVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                        }}
                      />
                    </div>
                  </div>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {renderFeatureBadges(template.features)}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <strong>Placeholders:</strong> {template.placeholders.length} fields
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            className="w-full"
                            onClick={() => setSelectedTemplate(template)}
                          >
                            Use Template
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Generate with {template.name}</DialogTitle>
                            <DialogDescription>
                              Create your design using this template. Describe what you want to create.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                Prompt (describe your design)
                              </label>
                              <Textarea
                                placeholder="E.g., Create a flyer for a bakery grand opening with warm colors..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={3}
                              />
                            </div>

                            {brandKits.length > 0 && (
                              <div>
                                <label className="text-sm font-medium mb-2 block">
                                  Brand Kit (optional)
                                </label>
                                <Select value={selectedBrandKit} onValueChange={setSelectedBrandKit}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose a brand kit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No brand kit</SelectItem>
                                    {brandKits.map((kit: BrandKit) => (
                                      <SelectItem key={kit.id} value={kit.id.toString()}>
                                        {kit.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-medium mb-2">Template Fields:</h4>
                              <div className="flex flex-wrap gap-2">
                                {template.placeholders.map((placeholder) => (
                                  <Badge key={placeholder} variant="outline" className="text-xs">
                                    {placeholder}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <Button 
                              onClick={handleGenerate}
                              disabled={generateMutation.isPending}
                              className="w-full"
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
            <h2 className="text-2xl font-bold mb-4">Generated Design</h2>
            <div className="bg-gray-100 p-4 rounded-lg">
              <iframe
                srcDoc={generatedHtml}
                className="w-full h-96 border rounded"
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
              >
                Download HTML
              </Button>
              <Button variant="outline">
                Generate PNG
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}