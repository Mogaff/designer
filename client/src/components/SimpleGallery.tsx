import { useRef } from 'react';
import { getQueryFn } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserCreation } from '@shared/schema';

interface CreationsResponse {
  creations: UserCreation[];
}

export default function SimpleGallery() {
  const { isAuthenticated } = useAuth();
  
  // Reference to the scrollable container
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch user creations
  const { data, isLoading } = useQuery<CreationsResponse>({
    queryKey: ['/api/creations'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: isAuthenticated,
    // Refresh every 10 seconds when component is visible
    refetchInterval: 10000,
  });
  
  const creations = data?.creations || [];
  const hasCreations = creations.length > 0;

  // Scroll handlers
  const scrollUp = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: -100, behavior: 'smooth' });
    }
  };

  const scrollDown = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: 100, behavior: 'smooth' });
    }
  };

  if (isLoading || !hasCreations) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-white/50 text-xs text-center">
          {isLoading ? 'Loading...' : 'No designs yet'}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Scroll controls */}
      <div className="flex justify-between items-center mb-1 px-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-4 w-4 rounded-full bg-black/40 text-white hover:bg-black/60 p-0"
          onClick={scrollUp}
        >
          <ChevronUp className="h-2 w-2" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-4 w-4 rounded-full bg-black/40 text-white hover:bg-black/60 p-0"
          onClick={scrollDown}
        >
          <ChevronDown className="h-2 w-2" />
        </Button>
      </div>
      
      {/* Gallery Items - Only images in a vertical list */}
      <div 
        ref={scrollRef} 
        className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        <div className="flex flex-col gap-1.5 pb-1">
          {creations.map((creation) => (
            <div key={creation.id} className="w-full">
              <div className="w-full aspect-square overflow-hidden rounded-md backdrop-blur-sm bg-black/40 border border-white/5">
                <img 
                  src={creation.imageUrl} 
                  alt="Design"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}