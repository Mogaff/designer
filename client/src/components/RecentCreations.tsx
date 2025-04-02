import { useCallback, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { getQueryFn } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BookMarked, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { UserCreation } from '@shared/schema';

interface CreationsResponse {
  creations: UserCreation[];
}

interface RecentCreationsProps {
  vertical?: boolean;
}

export default function RecentCreations({ vertical = false }: RecentCreationsProps) {
  // Only use carousel for horizontal layout, for vertical we'll use a simple scrollable div
  const [emblaRef, emblaApi] = vertical 
    ? [null, null] as [React.RefObject<HTMLDivElement> | null, any]
    : useEmblaCarousel(
        { loop: true, align: 'start' }, 
        [Autoplay({ delay: 4000 })]
      );
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  // Fetch user creations
  const { data, isLoading, refetch } = useQuery<CreationsResponse>({
    queryKey: ['/api/creations'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: isAuthenticated,
    // Refresh every 5 seconds when component is visible
    refetchInterval: 5000,
  });
  
  const creations = data?.creations || [];
  const hasCreations = creations.length > 0;

  // Reference to the scrollable container for vertical mode
  const verticalScrollRef = useRef<HTMLDivElement>(null);

  const scrollPrev = useCallback(() => {
    if (vertical && verticalScrollRef.current) {
      // Scroll up in vertical mode
      verticalScrollRef.current.scrollBy({ top: -100, behavior: 'smooth' });
    } else if (emblaApi) {
      // Use carousel for horizontal mode
      emblaApi.scrollPrev();
    }
  }, [emblaApi, vertical]);

  const scrollNext = useCallback(() => {
    if (vertical && verticalScrollRef.current) {
      // Scroll down in vertical mode
      verticalScrollRef.current.scrollBy({ top: 100, behavior: 'smooth' });
    } else if (emblaApi) {
      // Use carousel for horizontal mode
      emblaApi.scrollNext();
    }
  }, [emblaApi, vertical]);

  const handleViewInGallery = useCallback(() => {
    setLocation('/gallery');
  }, [setLocation]);

  if (isLoading) {
    return (
      <div className="w-full bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-md font-semibold text-white">My Designs</h3>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-none w-[200px]">
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!hasCreations && isAuthenticated) {
    return (
      <div className="w-full bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4 mt-6">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="bg-gray-800/50 rounded-full p-4 mb-3">
            <BookMarked className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-white">No designs saved yet</h3>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4 mt-6">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="bg-gray-800/50 rounded-full p-4 mb-3">
            <BookMarked className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-white">Log in to see your designs</h3>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full bg-black/30 backdrop-blur-md rounded-xl border border-white/10 ${vertical ? 'p-1' : 'p-2 mt-4'}`}>
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1">
          <h3 className={`${vertical ? 'text-[10px]' : 'text-md'} font-semibold text-white`}>{vertical ? 'My Designs' : 'My Designs'}</h3>
          <Badge variant="secondary" className={`${vertical ? 'text-[8px] px-1 py-0' : 'text-xs'}`}>{creations.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          {vertical ? (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 rounded-full bg-black/40 text-white hover:bg-black/60 p-0"
                onClick={scrollPrev}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 rounded-full bg-black/40 text-white hover:bg-black/60 p-0"
                onClick={scrollNext}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60"
                onClick={scrollPrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/60"
                onClick={scrollNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className={`${vertical ? 'ml-0 h-5 text-[8px] py-0 px-1' : 'ml-2 h-8 text-xs'} border-gray-700 bg-black/40 text-white hover:bg-black/60`}
            onClick={handleViewInGallery}
          >
            {vertical ? 'All' : 'View All'}
          </Button>
        </div>
      </div>

      {vertical ? (
        // Verbesserte vertikale Scrollansicht ohne Carousel
        <div ref={verticalScrollRef} className="overflow-y-auto h-[calc(100vh-170px)] pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <div className="grid grid-cols-1 gap-2 pb-2">
            {creations.map((creation) => (
              <div key={creation.id} className="w-full">
                <Card className="overflow-hidden bg-black/40 backdrop-blur-sm border-gray-800/50 shadow-sm shadow-black/20 hover:bg-black/60 transition-colors">
                  {/* Konsistentes Seitenverhältnis für alle Bilder in der vertikalen Galerie */}
                  <div className="relative w-full aspect-square overflow-hidden">
                    <img 
                      src={creation.imageUrl} 
                      alt={creation.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-white/90 text-xs font-medium truncate">
                      {creation.name}
                    </p>
                    <p className="text-white/50 text-[10px]">
                      {creation.created_at ? new Date(creation.created_at).toLocaleDateString() : 'Recently created'}
                    </p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Verbesserte horizontale Carousel-Ansicht
        <div className="overflow-hidden h-full rounded-lg" ref={emblaRef}>
          <div className="flex gap-3 pl-1 pr-2 py-1">
            {creations.map((creation) => (
              <div key={creation.id} className="flex-none min-w-[180px] max-w-[180px]">
                <Card className="overflow-hidden bg-black/40 backdrop-blur-sm border-gray-800/50 h-full shadow-lg shadow-black/10 hover:shadow-black/20 transition-all">
                  <div className="relative aspect-square w-full overflow-hidden">
                    <img 
                      src={creation.imageUrl} 
                      alt={creation.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-white/90 text-xs font-medium truncate">
                      {creation.name}
                    </p>
                    <p className="text-white/50 text-[10px]">
                      {creation.created_at ? new Date(creation.created_at).toLocaleDateString() : 'Recently created'}
                    </p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}