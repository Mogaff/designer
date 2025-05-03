import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DesignVariation } from '@/lib/types';
import gsap from 'gsap';

type AnimatedTransformationShowcaseProps = {
  designs: DesignVariation[];
  aspectRatio: string;
  isActive: boolean;
  onComplete?: () => void;
};

export function AnimatedTransformationShowcase({
  designs,
  aspectRatio,
  isActive,
  onComplete
}: AnimatedTransformationShowcaseProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  
  // Initialize image refs array based on designs length
  useEffect(() => {
    imageRefs.current = Array(designs.length).fill(null);
  }, [designs.length]);
  
  // Animation sequence when component becomes active
  useEffect(() => {
    if (!isActive || designs.length < 2) return;
    
    const animationDuration = 1.2; // seconds per transition
    const pauseDuration = 0.8; // seconds to pause on each design
    const totalDuration = designs.length * (animationDuration + pauseDuration);
    
    const startAnimation = async () => {
      setIsAnimating(true);
      
      // Loop through all designs
      for (let i = 0; i < designs.length; i++) {
        setCurrentIndex(i);
        
        // Wait for the pause duration before starting the next transition
        await new Promise(resolve => setTimeout(resolve, pauseDuration * 1000));
        
        // If this is the last design, we don't need to transition
        if (i === designs.length - 1) break;
        
        // Transition to the next design using GSAP
        if (containerRef.current && imageRefs.current[i] && imageRefs.current[i+1]) {
          const timeline = gsap.timeline();
          
          // Fade out current design
          timeline.to(imageRefs.current[i], {
            opacity: 0,
            duration: animationDuration / 2,
          });
          
          // Fade in next design
          timeline.to(imageRefs.current[i+1], {
            opacity: 1,
            duration: animationDuration / 2,
          }, `-=${animationDuration / 4}`);
          
          // Wait for the animation to complete
          await new Promise(resolve => setTimeout(resolve, animationDuration * 1000));
        }
      }
      
      setIsAnimating(false);
      if (onComplete) onComplete();
    };
    
    startAnimation();
    
    // Cleanup function
    return () => {
      gsap.killTweensOf(imageRefs.current);
      setIsAnimating(false);
    };
  }, [isActive, designs, onComplete]);
  
  if (!designs.length) return null;
  
  // Calculate dimensions based on aspect ratio
  const getAspectRatioDimensions = () => {
    const aspectRatioMap: Record<string, { width: string, height: string }> = {
      'square': { width: '100%', height: '100%' },
      'landscape': { width: '100%', height: 'calc(100% * 9/16)' },
      'portrait': { width: 'calc(100% * 9/16)', height: '100%' },
      'story': { width: 'calc(100% * 9/20)', height: '100%' },
      'post': { width: '100%', height: '100%' },
      'facebook': { width: '100%', height: 'calc(100% * 1/1.91)' },
      'twitter': { width: '100%', height: 'calc(100% * 1/2)' },
      'a4landscape': { width: '100%', height: 'calc(100% * 210/297)' },
      'a4portrait': { width: 'calc(100% * 210/297)', height: '100%' },
    };
    
    return aspectRatioMap[aspectRatio] || { width: '100%', height: '100%' };
  };
  
  const { width, height } = getAspectRatioDimensions();
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-xl shadow-lg"
      style={{ aspectRatio: aspectRatio === 'square' ? '1/1' : aspectRatio === 'landscape' ? '16/9' : '4/5' }}
    >
      {/* Progress indicator */}
      <div className="absolute top-2 right-2 z-20 flex gap-1 px-2 py-1 bg-black/30 backdrop-blur-sm rounded-full">
        {designs.map((_, index) => (
          <div 
            key={`progress-${index}`}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
              index === currentIndex ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
      
      {/* Animated text overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <AnimatePresence>
          {isAnimating && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-white font-medium text-lg drop-shadow-md text-center px-4"
            >
              Transforming your design...
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Design images stack */}
      <div className="relative w-full h-full">
        {designs.map((design, index) => (
          <div
            key={`design-${design.id || index}`}
            className="absolute inset-0 w-full h-full transition-opacity duration-300"
            style={{ 
              opacity: index === 0 ? 1 : 0,
              zIndex: designs.length - index,
            }}
          >
            <img
              ref={el => { imageRefs.current[index] = el; }}
              src={design.imageBase64}
              alt={`Design variant ${index + 1}`}
              className="object-cover w-full h-full"
              style={{ width, height }}
              loading="eager"
            />
          </div>
        ))}
      </div>
    </div>
  );
}