import React from 'react';
import { FlickeringGrid } from './flickering-grid';

interface MultiColorLoadingProps {
  className?: string;
  width?: number;
  height?: number;
}

export const MultiColorLoading: React.FC<MultiColorLoadingProps> = ({
  className = '',
  width,
  height
}) => {
  return (
    <div className={`relative overflow-hidden bg-white rounded-lg ${className}`} style={{ width, height }}>
      {/* Black dots */}
      <FlickeringGrid
        className="absolute inset-0 z-10"
        squareSize={4}
        gridGap={8}
        color="#000000"
        maxOpacity={0.2}
        flickerChance={0.1}
      />
      
      {/* Orange dots */}
      <FlickeringGrid
        className="absolute inset-0 z-20"
        squareSize={3}
        gridGap={10}
        color="#FF5722" // Orange
        maxOpacity={0.3}
        flickerChance={0.15}
      />
      
      {/* Indigo dots */}
      <FlickeringGrid
        className="absolute inset-0 z-30"
        squareSize={2}
        gridGap={12}
        color="#4F46E5" // Indigo
        maxOpacity={0.25}
        flickerChance={0.2}
      />
      
      {/* Loading indicator in the center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-40">
        <div className="text-lg font-medium text-gray-800 mb-2">Loading your design</div>
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};