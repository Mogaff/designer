import React, { useState, useEffect } from 'react';
import { GeneratedFlyer } from '@/lib/types';
import EnhancedDesignEditor from '@/components/EnhancedDesignEditor';

interface CanvasEditorProps {
  generatedFlyer: GeneratedFlyer | null;
  isGenerating: boolean;
  onSave?: (editedFlyer: GeneratedFlyer) => void;
}

export default function CanvasEditor({ generatedFlyer, isGenerating, onSave }: CanvasEditorProps) {
  const [showGenerationProgress, setShowGenerationProgress] = useState(false);
  const [generationProgressSteps, setGenerationProgressSteps] = useState<string[]>([]);
  const [generationProgressPercent, setGenerationProgressPercent] = useState(0);

  // Setup generation progress visualization
  useEffect(() => {
    if (isGenerating && !showGenerationProgress) {
      setShowGenerationProgress(true);
      
      // Initialize with meaningful steps
      setGenerationProgressSteps([
        "Analyzing request...",
        "Planning design layout...",
        "Generating visual elements...",
        "Applying style adjustments...",
        "Finalizing design..."
      ]);
      
      // Start at 25% immediately to give a feeling of faster progress
      setGenerationProgressPercent(25);
      
      // Accelerated progress simulation - faster initial progress
      const simulateProgress = () => {
        // Move quickly to 90% then slow down for the final steps
        const interval = setInterval(() => {
          setGenerationProgressPercent(prevPercent => {
            if (prevPercent < 50) {
              // Move quickly to 50%
              return prevPercent + 5;
            } else if (prevPercent < 80) {
              // Slightly slower to 80%
              return prevPercent + 3;
            } else if (prevPercent < 90) {
              // Even slower to 90%
              return prevPercent + 1;
            }
            // Hold at 90% until generation completes
            return 90;
          });
        }, 100); // Faster interval
        
        return interval;
      };
      
      const progressInterval = simulateProgress();
      
      return () => {
        clearInterval(progressInterval);
      };
    } else if (!isGenerating) {
      // When generation completes, quickly show 100%
      setGenerationProgressPercent(100);
      
      // After a brief delay, hide the progress indicator
      const hideTimeout = setTimeout(() => {
        setShowGenerationProgress(false);
        setGenerationProgressSteps([]);
        setGenerationProgressPercent(0);
      }, 800);
      
      return () => {
        clearTimeout(hideTimeout);
      };
    }
  }, [isGenerating]);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Full-screen canvas area */}
      <div className="relative bg-transparent w-full h-full overflow-hidden">
        
        {/* Generation progress overlay */}
        {showGenerationProgress && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-20 flex flex-col items-center justify-center p-6">
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
        
        {/* Enhanced Design Editor Component */}
        <EnhancedDesignEditor 
          generatedFlyer={generatedFlyer}
          isGenerating={isGenerating}
          onSave={onSave}
        />
      </div>
    </div>
  );
}