import React, { useEffect, useRef, useState } from 'react';

interface FlickeringGridProps {
  className?: string;
  squareSize?: number;
  gridGap?: number;
  color?: string;
  maxOpacity?: number;
  flickerChance?: number; // Chance for a square to change state per animation frame (0-1)
}

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  className = '',
  squareSize = 4,
  gridGap = 8,
  color = '#000000',
  maxOpacity = 0.3,
  flickerChance = 0.1
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const requestRef = useRef<number | null>(null);
  const gridSquaresRef = useRef<boolean[][]>([]);

  // Set up the canvas dimensions based on the parent container
  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const { width, height } = canvasRef.current.getBoundingClientRect();
        setDimensions({ width, height });
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        
        // Initialize the grid data
        const cols = Math.ceil(width / (squareSize + gridGap));
        const rows = Math.ceil(height / (squareSize + gridGap));
        
        const newGrid: boolean[][] = [];
        for (let y = 0; y < rows; y++) {
          newGrid[y] = [];
          for (let x = 0; x < cols; x++) {
            newGrid[y][x] = Math.random() < 0.5;
          }
        }
        gridSquaresRef.current = newGrid;
      }
    };

    updateDimensions();
    
    // Add resize event listener
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [squareSize, gridGap]);

  // Animation loop for flickering effect
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0 || dimensions.height === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const cols = Math.ceil(dimensions.width / (squareSize + gridGap));
    const rows = Math.ceil(dimensions.height / (squareSize + gridGap));
    
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      
      // Update grid state with flickering
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (Math.random() < flickerChance) {
            gridSquaresRef.current[y][x] = !gridSquaresRef.current[y][x];
          }
        }
      }
      
      // Draw each grid square
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const isActive = gridSquaresRef.current[y][x];
          if (isActive) {
            ctx.fillStyle = color;
            ctx.globalAlpha = Math.random() * maxOpacity;
            ctx.fillRect(
              x * (squareSize + gridGap),
              y * (squareSize + gridGap),
              squareSize,
              squareSize
            );
          }
        }
      }
      
      ctx.globalAlpha = 1;
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [dimensions, squareSize, gridGap, color, maxOpacity, flickerChance]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: 'block' }}
    />
  );
};