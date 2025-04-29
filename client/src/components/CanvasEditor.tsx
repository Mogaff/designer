import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GeneratedFlyer } from '@/lib/types';
import { Loader, Save, Download, Plus, Trash, MoveHorizontal, Share2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

interface CanvasEditorProps {
  generatedFlyer: GeneratedFlyer | null;
  isGenerating: boolean;
  onSave?: (editedFlyer: GeneratedFlyer) => void;
}

interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'shape';
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
}

export default function CanvasEditor({ generatedFlyer, isGenerating, onSave }: CanvasEditorProps) {
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showGenerationProgress, setShowGenerationProgress] = useState(false);
  const [generationProgressSteps, setGenerationProgressSteps] = useState<string[]>([]);
  const [generationProgressPercent, setGenerationProgressPercent] = useState(0);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Setup dummy generation progress for demo
  useEffect(() => {
    if (isGenerating && !showGenerationProgress) {
      setShowGenerationProgress(true);
      simulateGenerationProgress();
    } else if (!isGenerating) {
      setShowGenerationProgress(false);
      setGenerationProgressSteps([]);
      setGenerationProgressPercent(0);
    }
  }, [isGenerating]);

  // Simulate AI generation progress steps
  const simulateGenerationProgress = () => {
    const steps = [
      "Analyzing prompt and requirements...",
      "Generating design concepts...",
      "Creating color palettes...",
      "Arranging layout elements...",
      "Applying brand guidelines...",
      "Optimizing typography...",
      "Finalizing design..."
    ];
    
    let currentStep = 0;
    const totalSteps = steps.length;
    
    const interval = setInterval(() => {
      if (currentStep >= totalSteps) {
        clearInterval(interval);
        return;
      }
      
      setGenerationProgressSteps(prevSteps => [...prevSteps, steps[currentStep]]);
      setGenerationProgressPercent(Math.round(((currentStep + 1) / totalSteps) * 100));
      currentStep++;
    }, 1000);
    
    return () => clearInterval(interval);
  };

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
          width: 500,
          height: 500,
          rotation: 0,
          zIndex: 1
        },
        {
          id: 'headline',
          type: 'text',
          content: generatedFlyer.headline || 'Add Headline',
          x: 40,
          y: 40,
          width: 400,
          height: 60,
          rotation: 0,
          zIndex: 2,
          fontSize: 28,
          fontFamily: 'Arial',
          color: '#ffffff'
        },
        {
          id: 'content',
          type: 'text',
          content: generatedFlyer.content || 'Add Description',
          x: 40,
          y: 120,
          width: 400,
          height: 100,
          rotation: 0,
          zIndex: 2,
          fontSize: 16,
          fontFamily: 'Arial',
          color: '#ffffff'
        }
      ];
      
      setCanvasElements(defaultElements);
    }
  }, [generatedFlyer, isGenerating]);

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

  // Add a new element to the canvas
  const addElement = (type: 'text' | 'image' | 'shape') => {
    const newElement: CanvasElement = {
      id: `element-${Date.now()}`,
      type,
      content: type === 'text' ? 'New Text' : (type === 'shape' ? 'rectangle' : ''),
      x: 50,
      y: 50,
      width: type === 'text' ? 200 : 100,
      height: type === 'text' ? 50 : 100,
      rotation: 0,
      zIndex: canvasElements.length + 1,
      fontSize: type === 'text' ? 16 : undefined,
      fontFamily: type === 'text' ? 'Arial' : undefined,
      color: type === 'text' ? '#ffffff' : undefined,
      backgroundColor: type === 'shape' ? '#3b82f6' : undefined
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

  // Save the current design to gallery
  const saveDesign = async () => {
    if (!generatedFlyer || !isAuthenticated) return;
    
    setIsSaving(true);
    
    try {
      // In a real implementation, you would capture the canvas as an image here
      // For this example, we'll just use the original image
      
      const designName = generatedFlyer.headline || `Design ${new Date().toLocaleTimeString()}`;
      
      await apiRequest('POST', '/api/creations', {
        name: designName,
        imageUrl: generatedFlyer.imageUrl,
        headline: generatedFlyer.headline || '',
        content: generatedFlyer.content || '',
        stylePrompt: generatedFlyer.stylePrompt || '',
        template: generatedFlyer.template || 'canvas'
      });
      
      toast({
        title: "Design saved!",
        description: "Your design has been saved to your gallery."
      });
      
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
  const downloadDesign = () => {
    if (!generatedFlyer) return;

    // In a real implementation, you would capture the canvas as an image here
    // For this example, we'll just use the original image
    const link = document.createElement("a");
    link.href = generatedFlyer.imageUrl;
    link.download = `design-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Canvas Editor</h2>
          
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              className="bg-indigo-500/70 text-white hover:bg-indigo-600/70"
              onClick={() => setShowControls(!showControls)}
            >
              {showControls ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showControls ? 'Hide Controls' : 'Show Controls'}
            </Button>
            
            <Button 
              size="sm" 
              className="bg-green-600/70 text-white hover:bg-green-700/70"
              onClick={saveDesign}
              disabled={isSaving || isGenerating}
            >
              {isSaving ? (
                <Loader className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
            
            <Button 
              size="sm" 
              className="bg-indigo-500/70 text-white hover:bg-indigo-600/70"
              onClick={downloadDesign}
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
        
        {showControls && (
          <div className="flex items-center space-x-2 mb-4">
            <Button 
              size="sm" 
              variant="outline" 
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => addElement('text')}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Text
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => addElement('shape')}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Shape
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              className="border-white/20 text-white hover:bg-white/10"
              onClick={deleteSelectedElement}
              disabled={!selectedElement || selectedElement === 'background'}
            >
              <Trash className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        )}
        
        {/* Canvas area */}
        <div className="relative bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg overflow-hidden" style={{ height: '500px' }}>
          {/* Generation progress overlay */}
          {showGenerationProgress && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6">
              <h3 className="text-xl font-bold text-white mb-4">Creating Your Design</h3>
              
              <div className="w-full max-w-md mb-8">
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500" 
                    style={{ width: `${generationProgressPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>Generating...</span>
                  <span>{generationProgressPercent}%</span>
                </div>
              </div>
              
              <div className="w-full max-w-md border border-gray-800 rounded-lg bg-black/40 p-3 max-h-60 overflow-y-auto">
                {generationProgressSteps.map((step, index) => (
                  <div key={index} className="flex items-center mb-2 last:mb-0 animate-fadeIn">
                    <div className="w-4 h-4 rounded-full bg-indigo-500/30 flex items-center justify-center mr-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    </div>
                    <p className="text-sm text-gray-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Design canvas */}
          <div 
            ref={canvasRef}
            className="relative w-full h-full"
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
                  position: 'absolute'
                }}
                whileDrag={{ scale: 1.02 }}
                onClick={() => handleSelectElement(element.id)}
                className={`${selectedElement === element.id ? 'ring-2 ring-indigo-500' : ''}`}
              >
                {element.type === 'text' && (
                  <div 
                    contentEditable={selectedElement === element.id}
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
                      padding: '0.5rem',
                      outline: 'none',
                      userSelect: selectedElement === element.id ? 'text' : 'none'
                    }}
                  >
                    {element.content}
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
                      height: '100%', 
                      backgroundColor: element.backgroundColor
                    }}
                  ></div>
                )}
                
                {/* Resize and rotate handles (would be implemented with interact.js or similar in a full implementation) */}
                {selectedElement === element.id && element.id !== 'background' && (
                  <div className="absolute -right-1 -bottom-1 w-4 h-4 bg-indigo-500 rounded-full cursor-se-resize"></div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}