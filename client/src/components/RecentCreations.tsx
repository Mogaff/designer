import { useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { getQueryFn } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BookMarked, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { UserCreation } from '@shared/schema';

interface CreationsResponse {
  creations: UserCreation[];
}

export default function RecentCreations() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [Autoplay({ delay: 4000 })]);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  // Fetch user creations
  const { data, isLoading } = useQuery<CreationsResponse>({
    queryKey: ['/api/creations'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: isAuthenticated,
  });
  
  const creations = data?.creations || [];
  const hasCreations = creations.length > 0;

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const handleViewInGallery = useCallback(() => {
    setLocation('/gallery');
  }, [setLocation]);

  if (isLoading) {
    return (
      <div className="w-full bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-md font-semibold text-white">Your Recent Designs</h3>
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
          <BookMarked className="h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No designs saved yet</h3>
          <p className="text-white/60 text-sm mb-4">Your saved designs will appear here</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4 mt-6">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <BookMarked className="h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">Log in to see your designs</h3>
          <p className="text-white/60 text-sm mb-4">Sign in to save and view your creations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4 mt-6">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-md font-semibold text-white">Your Recent Designs</h3>
          <Badge variant="secondary" className="text-xs">{creations.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
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
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2 h-8 text-xs border-gray-700 bg-black/40 text-white hover:bg-black/60"
            onClick={handleViewInGallery}
          >
            View All
          </Button>
        </div>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {creations.map((creation) => (
            <div key={creation.id} className="flex-none min-w-[200px] max-w-[200px]">
              <Card className="overflow-hidden bg-black/40 backdrop-blur-sm border-gray-800 h-full">
                <div className="relative h-32 overflow-hidden">
                  <img 
                    src={creation.imageUrl} 
                    alt={creation.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2">
                  <p className="text-white/90 text-xs font-medium truncate">
                    {creation.name}
                  </p>
                  <p className="text-white/50 text-xs">
                    {new Date(creation.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}