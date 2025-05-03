import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GeneratedFlyer } from '@/lib/types';
import { 
  Loader, Save, Download, Plus, Trash, 
  MoveHorizontal, Share2, Eye, EyeOff, 
  Type, Square, Image as ImageIcon, 
  PanelLeft, Palette, Sliders, Copy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import html2canvas from 'html2canvas';
import WebFont from 'webfontloader';
import SunEditor from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Slider
} from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Default popular Google fonts
const popularFonts = [
  'Open Sans',
  'Roboto',
  'Lato',
  'Montserrat',
  'Oswald',
  'Raleway',
  'Poppins',
  'Playfair Display',
  'Noto Sans',
  'Source Sans Pro'
];

interface CanvasEditorProps {
  generatedFlyer: GeneratedFlyer | null;
  isGenerating: boolean;
  onSave?: (editedFlyer: GeneratedFlyer) => void;
}

interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'richText';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  opacity?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  padding?: number;
  textAlign?: 'left' | 'center' | 'right';
  boxShadow?: string;
}

export default function EnhancedDesignEditor({ generatedFlyer, isGenerating, onSave }: CanvasEditorProps) {
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editorTab, setEditorTab] = useState('style');
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(800);
  const [savedDesigns, setSavedDesigns] = useState<GeneratedFlyer[]>([]);
  const [isScreenshotting, setIsScreenshotting] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Load saved designs for the current user
  useEffect(() => {
    if (isAuthenticated) {
      const fetchDesigns = async () => {
        try {
          const response = await apiRequest<API.CreationsResponse>('GET', '/api/creations');
          if (response && response.creations) {
            setSavedDesigns(response.creations);
          }
        } catch (error) {
          console.error('Failed to fetch designs:', error);
        }
      };
      
      fetchDesigns();
    }
  }, [isAuthenticated]);

  // Load Google Fonts
  useEffect(() => {
    WebFont.load({
      google: {
        families: popularFonts
      }
    });
  }, []);

  // Update canvas dimensions based on aspect ratio
  useEffect(() => {
    if (generatedFlyer) {
      // For simplicity, we're keeping the dimensions fixed in this example
      // You would typically adjust this based on the aspect ratio
      setCanvasWidth(800);
      setCanvasHeight(800);
    }
  }, [generatedFlyer]);

  // Effect to initialize canvas when a new flyer is loaded
  useEffect(() => {
    if (generatedFlyer && !isGenerating) {
      // Create a default layout when a new image is loaded
      const defaultElements: CanvasElement[] = [
        {
          id: 'background',
          type: 'image',
          content: generatedFlyer.imageUrl,
          x: 0,
          y: 0,
          width: canvasWidth,
          height: canvasHeight,
          rotation: 0,
          zIndex: 1
        },
        {
          id: 'headline',
          type: 'text',
          content: generatedFlyer.headline || 'Add Headline',
          x: canvasWidth * 0.1,
          y: canvasHeight * 0.1,
          width: canvasWidth * 0.8,
          height: canvasHeight * 0.1,
          rotation: 0,
          zIndex: 2,
          fontSize: 36,
          fontFamily: generatedFlyer.fontSettings?.headingFont || 'Montserrat',
          color: '#ffffff',
          textAlign: 'center',
          padding: 10,
          opacity: 1,
          backgroundColor: 'rgba(0,0,0,0)'
        },
        {
          id: 'content',
          type: 'text',
          content: generatedFlyer.content || 'Add Description',
          x: canvasWidth * 0.1,
          y: canvasHeight * 0.25,
          width: canvasWidth * 0.8,
          height: canvasHeight * 0.2,
          rotation: 0,
          zIndex: 2,
          fontSize: 18,
          fontFamily: generatedFlyer.fontSettings?.bodyFont || 'Open Sans',
          color: '#ffffff',
          textAlign: 'center',
          padding: 10,
          opacity: 1,
          backgroundColor: 'rgba(0,0,0,0)'
        }
      ];
      
      setCanvasElements(defaultElements);
    }
  }, [generatedFlyer, isGenerating, canvasWidth, canvasHeight]);

  // Find the currently selected element
  const selectedElementData = canvasElements.find(el => el.id === selectedElement);

  // Handle element selection
  const handleSelectElement = (id: string) => {
    setSelectedElement(id);
  };

  // Handle element content change (for text elements)
  const handleElementContentChange = (id: string, content: string) => {
    setCanvasElements(elements => 
      elements.map(el => el.id === id ? { ...el, content } : el)
    );
  };

  // Update element property (for the properties panel)
  const updateElementProperty = <K extends keyof CanvasElement>(
    property: K, 
    value: CanvasElement[K]
  ) => {
    if (!selectedElement) return;
    
    setCanvasElements(elements => 
      elements.map(el => el.id === selectedElement ? { ...el, [property]: value } : el)
    );
  };

  // Add a new element to the canvas
  const addElement = (type: 'text' | 'image' | 'shape' | 'richText') => {
    const newElement: CanvasElement = {
      id: `element-${Date.now()}`,
      type,
      content: type === 'text' ? 'New Text' : 
               type === 'richText' ? '<p>Rich Text Editor</p>' :
               type === 'shape' ? 'rectangle' : '',
      x: canvasWidth * 0.3,
      y: canvasHeight * 0.3,
      width: type === 'text' ? canvasWidth * 0.4 : canvasWidth * 0.3,
      height: type === 'text' ? canvasHeight * 0.1 : canvasHeight * 0.3,
      rotation: 0,
      zIndex: Math.max(...canvasElements.map(el => el.zIndex), 0) + 1,
      fontSize: type === 'text' || type === 'richText' ? 18 : undefined,
      fontFamily: (type === 'text' || type === 'richText') ? 'Open Sans' : undefined,
      color: (type === 'text' || type === 'richText') ? '#ffffff' : undefined,
      backgroundColor: type === 'shape' ? 'rgba(59, 130, 246, 0.7)' : 'rgba(0,0,0,0)',
      opacity: 1,
      borderRadius: type === 'shape' ? 4 : 0,
      textAlign: (type === 'text' || type === 'richText') ? 'center' : undefined,
      padding: (type === 'text' || type === 'richText') ? 10 : 0
    };
    
    setCanvasElements([...canvasElements, newElement]);
    setSelectedElement(newElement.id);
  };

  // Delete the selected element
  const deleteSelectedElement = () => {
    if (selectedElement && selectedElement !== 'background') {
      setCanvasElements(elements => elements.filter(el => el.id !== selectedElement));
      setSelectedElement(null);
    }
  };

  // Duplicate the selected element
  const duplicateSelectedElement = () => {
    if (selectedElement && selectedElement !== 'background') {
      const elementToDuplicate = canvasElements.find(el => el.id === selectedElement);
      if (!elementToDuplicate) return;
      
      const newElement: CanvasElement = {
        ...elementToDuplicate,
        id: `element-${Date.now()}`,
        x: elementToDuplicate.x + 20,
        y: elementToDuplicate.y + 20,
        zIndex: Math.max(...canvasElements.map(el => el.zIndex), 0) + 1
      };
      
      setCanvasElements([...canvasElements, newElement]);
      setSelectedElement(newElement.id);
    }
  };

  // Take a screenshot of the canvas
  const takeScreenshot = async (): Promise<string | null> => {
    if (!canvasRef.current) return null;

    try {
      setIsScreenshotting(true);
      
      // Temporarily hide any editor UI elements
      const tempSelectedElement = selectedElement;
      setSelectedElement(null);
      
      // Use html2canvas to capture the canvas
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: null,
        scale: 2, // Higher quality
        logging: false,
        useCORS: true, // Allow cross-origin images
        allowTaint: true
      });
      
      // Restore UI state
      setSelectedElement(tempSelectedElement);
      
      // Convert to base64 image data
      const imageData = canvas.toDataURL('image/png');
      setIsScreenshotting(false);
      return imageData;
    } catch (error) {
      console.error('Screenshot error:', error);
      setIsScreenshotting(false);
      return null;
    }
  };

  // Save the current design to gallery
  const saveDesign = async () => {
    if (!generatedFlyer || !isAuthenticated) return;
    
    setIsSaving(true);
    
    try {
      // Take a screenshot of the current design
      const imageData = await takeScreenshot();
      if (!imageData) {
        throw new Error('Failed to capture design');
      }
      
      // Extract content from text elements for metadata
      const headline = canvasElements.find(el => el.id === 'headline')?.content || '';
      const content = canvasElements.find(el => el.id === 'content')?.content || '';
      
      const designName = headline || `Design ${new Date().toLocaleTimeString()}`;
      
      // Save design configuration for future editing
      const designConfig = JSON.stringify(canvasElements);
      
      await apiRequest('POST', '/api/creations', {
        name: designName,
        imageUrl: imageData,
        headline: headline,
        content: content,
        stylePrompt: generatedFlyer.stylePrompt || '',
        template: 'canvas',
        metadata: { designConfig }
      });
      
      toast({
        title: "Design saved!",
        description: "Your design has been saved to your gallery."
      });
      
      // Refresh the gallery
      queryClient.invalidateQueries({ queryKey: ['/api/creations'] });
      
    } catch (error) {
      toast({
        title: "Save failed",
        description: "There was a problem saving your design. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Download the current design
  const downloadDesign = async () => {
    try {
      const imageData = await takeScreenshot();
      if (!imageData) {
        throw new Error('Failed to capture design');
      }
      
      const link = document.createElement("a");
      link.href = imageData;
      link.download = `design-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Design downloaded",
        description: "Your design has been downloaded as a PNG image."
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "There was a problem downloading your design. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Load a saved design
  const loadDesign = (design: GeneratedFlyer) => {
    try {
      // Check if the design has configuration metadata
      if (design.metadata && typeof design.metadata === 'object' && 'designConfig' in design.metadata) {
        const designConfig = JSON.parse(design.metadata.designConfig as string);
        setCanvasElements(designConfig);
        
        toast({
          title: "Design loaded",
          description: "Your saved design has been loaded into the editor."
        });
      } else {
        // Fall back to basic loading if no configuration is available
        const basicElements: CanvasElement[] = [
          {
            id: 'background',
            type: 'image',
            content: design.imageUrl,
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight,
            rotation: 0,
            zIndex: 1
          },
          {
            id: 'headline',
            type: 'text',
            content: design.headline || 'Headline',
            x: canvasWidth * 0.1,
            y: canvasHeight * 0.1,
            width: canvasWidth * 0.8,
            height: canvasHeight * 0.1,
            rotation: 0,
            zIndex: 2,
            fontSize: 36,
            fontFamily: 'Montserrat',
            color: '#ffffff',
            textAlign: 'center'
          },
          {
            id: 'content',
            type: 'text',
            content: design.content || 'Content',
            x: canvasWidth * 0.1,
            y: canvasHeight * 0.25,
            width: canvasWidth * 0.8,
            height: canvasHeight * 0.2,
            rotation: 0,
            zIndex: 2,
            fontSize: 18,
            fontFamily: 'Open Sans',
            color: '#ffffff',
            textAlign: 'center'
          }
        ];
        
        setCanvasElements(basicElements);
        
        toast({
          title: "Basic design loaded",
          description: "This design was created with an older version of the editor. Some properties may be missing."
        });
      }
    } catch (error) {
      toast({
        title: "Failed to load design",
        description: "There was a problem loading your design. Please try again.",
        variant: "destructive",
      });
      console.error('Failed to load design:', error);
    }
  };

  return (
    <div className="h-full w-full flex flex-col" ref={editorContainerRef}>
      {/* Top toolbar - Glass Effect Icons */}
      <div className="absolute top-2 right-3 z-30 flex gap-1 scale-75 origin-top-right">
        <Button 
          size="sm" 
          className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm rounded-full w-6 h-6 p-0 shadow border border-white/10"
          onClick={() => setShowControls(!showControls)}
          title={showControls ? 'Hide Controls' : 'Show Controls'}
        >
          {showControls ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
        
        <Button 
          size="sm" 
          className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm rounded-full w-6 h-6 p-0 shadow border border-white/10"
          onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
          title={showPropertiesPanel ? 'Hide Properties' : 'Show Properties'}
        >
          <PanelLeft className="h-3 w-3" />
        </Button>
        
        <Button 
          size="sm" 
          className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm rounded-full w-6 h-6 p-0 shadow border border-white/10"
          onClick={saveDesign}
          disabled={isSaving || isGenerating || isScreenshotting}
          title="Save"
        >
          {isSaving ? (
            <Loader className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
        </Button>
        
        <Button 
          size="sm" 
          className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm rounded-full w-6 h-6 p-0 shadow border border-white/10"
          onClick={downloadDesign}
          disabled={isGenerating || isScreenshotting}
          title="Download"
        >
          <Download className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Bottom toolbar - Glass Effect Icons */}
      {showControls && (
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-1 bg-black/30 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm rounded-full w-8 h-8 p-0"
                  onClick={() => addElement('text')}
                >
                  <Type className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add Text</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm rounded-full w-8 h-8 p-0"
                  onClick={() => addElement('richText')}
                >
                  <Type className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add Rich Text</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm rounded-full w-8 h-8 p-0"
                  onClick={() => addElement('shape')}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add Shape</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Separator orientation="vertical" className="h-6 bg-white/10" />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  className={`rounded-full w-8 h-8 p-0 backdrop-blur-sm ${
                    !selectedElement || selectedElement === 'background' 
                      ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  onClick={duplicateSelectedElement}
                  disabled={!selectedElement || selectedElement === 'background'}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Duplicate Element</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  className={`rounded-full w-8 h-8 p-0 backdrop-blur-sm ${
                    !selectedElement || selectedElement === 'background' 
                      ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                  onClick={deleteSelectedElement}
                  disabled={!selectedElement || selectedElement === 'background'}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete Element</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      
      {/* Properties Panel */}
      {showPropertiesPanel && (
        <div className="absolute left-2 top-12 bottom-10 z-20 w-64 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-2 border-b border-white/10">
            <h3 className="text-white text-sm font-medium">Properties</h3>
            <Tabs value={editorTab} onValueChange={setEditorTab} className="w-auto">
              <TabsList className="h-7 p-0.5 bg-black/30">
                <TabsTrigger value="style" className="text-xs h-6 px-2">Style</TabsTrigger>
                <TabsTrigger value="library" className="text-xs h-6 px-2">Library</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex-grow overflow-y-auto">
            <TabsContent value="style" className="m-0">
              {!selectedElement && (
                <div className="p-3 text-white/70 text-xs">
                  Select an element to edit its properties.
                </div>
              )}
              
              {selectedElementData && (
                <div className="p-3 space-y-4">
                  {/* Common properties */}
                  <div className="space-y-2">
                    <Label className="text-white/80 text-xs">Opacity</Label>
                    <Slider 
                      value={[selectedElementData.opacity ?? 1]} 
                      min={0} 
                      max={1} 
                      step={0.01}
                      onValueChange={(values) => updateElementProperty('opacity', values[0])}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-white/60">
                      <span>0%</span>
                      <span>{Math.round((selectedElementData.opacity ?? 1) * 100)}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  
                  {/* Text specific properties */}
                  {(selectedElementData.type === 'text' || selectedElementData.type === 'richText') && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-white/80 text-xs">Font Family</Label>
                        <Select 
                          value={selectedElementData.fontFamily}
                          onValueChange={(value) => updateElementProperty('fontFamily', value)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select font" />
                          </SelectTrigger>
                          <SelectContent>
                            {popularFonts.map(font => (
                              <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                                {font}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white/80 text-xs">Font Size</Label>
                        <div className="flex gap-2">
                          <Slider 
                            value={[selectedElementData.fontSize ?? 16]} 
                            min={8} 
                            max={72} 
                            step={1}
                            onValueChange={(values) => updateElementProperty('fontSize', values[0])}
                            className="flex-grow"
                          />
                          <div className="w-12 h-8 bg-white/10 rounded flex items-center justify-center text-white text-xs">
                            {selectedElementData.fontSize}px
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white/80 text-xs">Text Color</Label>
                        <div className="flex gap-2 items-center">
                          <div 
                            className="w-6 h-6 rounded border border-white/20"
                            style={{ backgroundColor: selectedElementData.color }}
                          ></div>
                          <Input 
                            type="color"
                            value={selectedElementData.color}
                            onChange={(e) => updateElementProperty('color', e.target.value)}
                            className="w-full h-8"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white/80 text-xs">Text Alignment</Label>
                        <div className="flex gap-1">
                          <Button 
                            size="sm"
                            variant={selectedElementData.textAlign === 'left' ? 'default' : 'outline'}
                            className="h-8 flex-1"
                            onClick={() => updateElementProperty('textAlign', 'left')}
                          >
                            Left
                          </Button>
                          <Button 
                            size="sm"
                            variant={selectedElementData.textAlign === 'center' ? 'default' : 'outline'}
                            className="h-8 flex-1"
                            onClick={() => updateElementProperty('textAlign', 'center')}
                          >
                            Center
                          </Button>
                          <Button 
                            size="sm"
                            variant={selectedElementData.textAlign === 'right' ? 'default' : 'outline'}
                            className="h-8 flex-1"
                            onClick={() => updateElementProperty('textAlign', 'right')}
                          >
                            Right
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white/80 text-xs">Background Color</Label>
                        <div className="flex gap-2 items-center">
                          <div 
                            className="w-6 h-6 rounded border border-white/20"
                            style={{ backgroundColor: selectedElementData.backgroundColor }}
                          ></div>
                          <Input 
                            type="color"
                            value={selectedElementData.backgroundColor || 'rgba(0,0,0,0)'}
                            onChange={(e) => updateElementProperty('backgroundColor', e.target.value)}
                            className="w-full h-8"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white/80 text-xs">Padding</Label>
                        <Slider 
                          value={[selectedElementData.padding ?? 0]} 
                          min={0} 
                          max={40} 
                          step={1}
                          onValueChange={(values) => updateElementProperty('padding', values[0])}
                          className="w-full"
                        />
                        <div className="text-[10px] text-white/60 text-right">
                          {selectedElementData.padding ?? 0}px
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Shape specific properties */}
                  {selectedElementData.type === 'shape' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-white/80 text-xs">Background Color</Label>
                        <div className="flex gap-2 items-center">
                          <div 
                            className="w-6 h-6 rounded border border-white/20"
                            style={{ backgroundColor: selectedElementData.backgroundColor }}
                          ></div>
                          <Input 
                            type="color"
                            value={selectedElementData.backgroundColor || '#3b82f6'}
                            onChange={(e) => updateElementProperty('backgroundColor', e.target.value)}
                            className="w-full h-8"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white/80 text-xs">Border Radius</Label>
                        <Slider 
                          value={[selectedElementData.borderRadius ?? 0]} 
                          min={0} 
                          max={100} 
                          step={1}
                          onValueChange={(values) => updateElementProperty('borderRadius', values[0])}
                          className="w-full"
                        />
                        <div className="text-[10px] text-white/60 text-right">
                          {selectedElementData.borderRadius ?? 0}px
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white/80 text-xs">Border Width</Label>
                        <Slider 
                          value={[selectedElementData.borderWidth ?? 0]} 
                          min={0} 
                          max={20} 
                          step={1}
                          onValueChange={(values) => updateElementProperty('borderWidth', values[0])}
                          className="w-full"
                        />
                        <div className="text-[10px] text-white/60 text-right">
                          {selectedElementData.borderWidth ?? 0}px
                        </div>
                      </div>
                      
                      {(selectedElementData.borderWidth ?? 0) > 0 && (
                        <div className="space-y-2">
                          <Label className="text-white/80 text-xs">Border Color</Label>
                          <div className="flex gap-2 items-center">
                            <div 
                              className="w-6 h-6 rounded border border-white/20"
                              style={{ backgroundColor: selectedElementData.borderColor }}
                            ></div>
                            <Input 
                              type="color"
                              value={selectedElementData.borderColor || '#ffffff'}
                              onChange={(e) => updateElementProperty('borderColor', e.target.value)}
                              className="w-full h-8"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Image specific properties */}
                  {selectedElementData.type === 'image' && (
                    <>
                      {selectedElementData.id === 'background' && (
                        <div className="space-y-2">
                          <Label className="text-white/80 text-xs">Background Image</Label>
                          <div className="text-white/70 text-xs bg-black/20 p-2 rounded border border-white/10">
                            Current image can't be changed in this view. Generate a new design for a different background.
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="library" className="m-0">
              <div className="p-3">
                <h4 className="text-white text-xs font-medium mb-2">Saved Designs</h4>
                
                {savedDesigns.length === 0 ? (
                  <div className="text-white/70 text-xs">
                    No saved designs found. Save your designs to see them here.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {savedDesigns.slice(0, 6).map((design) => (
                      <div 
                        key={design.id} 
                        className="cursor-pointer rounded overflow-hidden border border-white/10 hover:border-white/30 transition-colors"
                        onClick={() => loadDesign(design)}
                      >
                        <div className="aspect-square relative">
                          <img 
                            src={design.imageUrl} 
                            alt={design.name || 'Saved design'} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-1 bg-black/30 text-[10px] text-white/80 truncate">
                          {design.name || 'Untitled'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </div>
      )}
      
      {/* Full-screen canvas area */}
      <div className="relative bg-transparent w-full h-full overflow-hidden">
        {/* Design canvas - centered in available space */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            ref={canvasRef}
            className={`relative backdrop-blur-md bg-white/5 border border-white/10 rounded-lg overflow-hidden ${isScreenshotting ? 'screenshot-mode' : ''}`}
            style={{ 
              width: canvasWidth,
              height: canvasHeight,
              maxWidth: '90%',
              maxHeight: '90%'
            }}
          >
            {canvasElements.map((element) => (
              <motion.div
                key={element.id}
                drag
                dragMomentum={false}
                initial={{ x: element.x, y: element.y, rotate: element.rotation }}
                style={{ 
                  width: element.width, 
                  height: element.height,
                  zIndex: element.zIndex,
                  position: 'absolute',
                  backgroundColor: element.backgroundColor,
                  opacity: element.opacity,
                  borderRadius: element.borderRadius,
                  border: element.borderWidth ? `${element.borderWidth}px solid ${element.borderColor || '#ffffff'}` : 'none',
                  padding: element.padding
                }}
                whileDrag={{ scale: 1.02 }}
                onClick={() => handleSelectElement(element.id)}
                className={`${selectedElement === element.id && !isScreenshotting ? 'ring-2 ring-white/80' : ''}`}
              >
                {element.type === 'text' && (
                  <div 
                    contentEditable={selectedElement === element.id && !isScreenshotting}
                    suppressContentEditableWarning
                    onBlur={(e) => handleElementContentChange(element.id, e.currentTarget.textContent || '')}
                    style={{ 
                      fontSize: element.fontSize, 
                      fontFamily: element.fontFamily,
                      color: element.color,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: element.textAlign === 'center' ? 'center' : 
                                      element.textAlign === 'right' ? 'flex-end' : 'flex-start',
                      textAlign: element.textAlign,
                      outline: 'none',
                      userSelect: selectedElement === element.id && !isScreenshotting ? 'text' : 'none',
                      overflow: 'hidden'
                    }}
                  >
                    {element.content}
                  </div>
                )}
                
                {element.type === 'richText' && (
                  <div 
                    style={{ 
                      width: '100%',
                      height: '100%',
                      overflow: 'hidden'
                    }}
                  >
                    {selectedElement === element.id && !isScreenshotting ? (
                      <SunEditor
                        setContents={element.content}
                        onChange={(content) => handleElementContentChange(element.id, content)}
                        setOptions={{
                          buttonList: [
                            ['bold', 'italic', 'underline', 'strike'],
                            ['font', 'fontSize', 'formatBlock'],
                            ['fontColor', 'hiliteColor', 'textStyle'],
                            ['removeFormat'],
                            ['align', 'horizontalRule', 'list', 'table'],
                            ['link', 'image']
                          ],
                          defaultStyle: `
                            font-family: ${element.fontFamily}; 
                            font-size: ${element.fontSize}px; 
                            color: ${element.color};
                            text-align: ${element.textAlign};
                          `,
                          height: '100%',
                          minHeight: '100%'
                        }}
                      />
                    ) : (
                      <div 
                        dangerouslySetInnerHTML={{ __html: element.content }}
                        style={{
                          fontFamily: element.fontFamily,
                          fontSize: element.fontSize,
                          color: element.color,
                          textAlign: element.textAlign,
                          height: '100%',
                          overflow: 'hidden'
                        }}
                      />
                    )}
                  </div>
                )}
                
                {element.type === 'image' && (
                  <img 
                    src={element.content} 
                    alt="Design element" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                
                {element.type === 'shape' && (
                  <div 
                    style={{ 
                      width: '100%', 
                      height: '100%'
                    }}
                  ></div>
                )}
                
                {/* Resize and rotate handles - only shown when selected and not in screenshot mode */}
                {selectedElement === element.id && !isScreenshotting && element.id !== 'background' && (
                  <>
                    <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-white rounded-full cursor-se-resize opacity-70"></div>
                    <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full cursor-e-resize opacity-70"></div>
                    <div className="absolute left-1/2 -bottom-1 transform -translate-x-1/2 w-4 h-4 bg-white rounded-full cursor-s-resize opacity-70"></div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}