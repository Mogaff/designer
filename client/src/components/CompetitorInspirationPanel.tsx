import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowRight, Sparkles, SearchIcon, ImageIcon, BookOpenIcon } from 'lucide-react';

type CompetitorAd = {
  id: number;
  platform: string;
  brand: string;
  headline: string | null;
  body: string | null;
  image_url: string | null;
  cta: string | null;
  style_description: string | null;
};

type CompetitorInspirationPanelProps = {
  onEnhancePrompt: (enhancedPrompt: string) => void;
  originalPrompt: string;
  isOpen: boolean;
};

export default function CompetitorInspirationPanel({
  onEnhancePrompt,
  originalPrompt,
  isOpen
}: CompetitorInspirationPanelProps) {
  const [queryType, setQueryType] = useState<'brand' | 'industry' | 'keyword'>('industry');
  const [queryText, setQueryText] = useState('');
  const [inspirationEnabled, setInspirationEnabled] = useState(false);
  const [selectedAds, setSelectedAds] = useState<CompetitorAd[]>([]);
  const { toast } = useToast();

  // If the user hasn't entered anything in the query text field,
  // we can extract keywords from their original prompt
  useEffect(() => {
    if (!queryText && originalPrompt) {
      // Try to extract industry or business type from the prompt
      const industries = [
        'tech', 'fashion', 'food', 'beauty', 'fitness', 'travel',
        'automotive', 'finance', 'real estate', 'education', 'healthcare'
      ];
      
      const promptLower = originalPrompt.toLowerCase();
      const foundIndustry = industries.find(industry => promptLower.includes(industry));
      
      if (foundIndustry) {
        setQueryText(foundIndustry);
        setQueryType('industry');
      }
    }
  }, [originalPrompt, queryText]);

  const searchAdsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ad-inspiration/search', {
        query: queryText,
        queryType,
        limit: 5
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.ads && data.ads.length > 0) {
        toast({
          title: 'Found competitor ads',
          description: `Found ${data.count} ads for ${queryType}: "${queryText}"`,
        });
        setSelectedAds(data.ads);
      } else {
        toast({
          title: 'No ads found',
          description: `Couldn't find any ads for ${queryType}: "${queryText}"`,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error searching ads',
        description: error instanceof Error ? error.message : 'Failed to search for competitor ads',
        variant: 'destructive',
      });
    }
  });

  const enhancePromptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/generate-with-inspiration', {
        promptText: originalPrompt,
        industry: queryType === 'industry' ? queryText : undefined,
        brand: queryType === 'brand' ? queryText : undefined,
        useCompetitorInsights: true
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.enhancedPrompt) {
        toast({
          title: 'Prompt enhanced',
          description: 'Your prompt has been enhanced with competitor insights',
        });
        onEnhancePrompt(data.enhancedPrompt);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error enhancing prompt',
        description: error instanceof Error ? error.message : 'Failed to enhance prompt',
        variant: 'destructive',
      });
    }
  });

  if (!isOpen) return null;

  return (
    <div className="space-y-4 bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/30 mb-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white flex items-center">
          <Sparkles className="h-4 w-4 mr-2 text-indigo-400" />
          Competitor Ad Inspiration
        </h3>
        <div className="flex items-center space-x-2">
          <Label htmlFor="enable-inspiration" className="text-xs text-white/70">
            Use competitor insights
          </Label>
          <Checkbox 
            id="enable-inspiration" 
            checked={inspirationEnabled}
            onCheckedChange={(checked) => setInspirationEnabled(checked as boolean)}
            className="data-[state=checked]:bg-indigo-500"
          />
        </div>
      </div>

      {inspirationEnabled && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Select value={queryType} onValueChange={(val) => setQueryType(val as 'brand' | 'industry' | 'keyword')}>
              <SelectTrigger className="bg-white/10 border-white/10 text-white text-xs">
                <SelectValue placeholder="Search type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="industry">Industry</SelectItem>
                <SelectItem value="brand">Brand Name</SelectItem>
                <SelectItem value="keyword">Keyword</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="col-span-2 flex items-center space-x-1">
              <Input 
                placeholder={`Enter ${queryType}`}
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                className="bg-white/10 border-white/10 text-white text-xs h-9"
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={() => searchAdsMutation.mutate()}
                disabled={searchAdsMutation.isPending || !queryText.trim()}
                className="h-9 bg-indigo-600 hover:bg-indigo-700"
              >
                {searchAdsMutation.isPending ? 
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div> :
                  <SearchIcon className="h-4 w-4" />
                }
              </Button>
            </div>
          </div>

          {/* Search results and selected ads */}
          <div className="space-y-3">
            {searchAdsMutation.isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full bg-white/5" />
                <Skeleton className="h-20 w-full bg-white/5" />
              </div>
            ) : selectedAds.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedAds.map(ad => (
                  <Card key={ad.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {ad.image_url ? (
                          <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-black/20">
                            <img 
                              src={ad.image_url} 
                              alt={ad.headline || 'Ad image'} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).onerror = null;
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 flex-shrink-0 rounded bg-black/20 flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-white/30" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-medium text-white truncate">{ad.brand}</h4>
                            <span className="text-[10px] text-white/50">{ad.platform}</span>
                          </div>
                          {ad.headline && (
                            <p className="text-xs text-white/80 truncate font-medium">{ad.headline}</p>
                          )}
                          {ad.body && (
                            <p className="text-[10px] text-white/60 line-clamp-2">{ad.body}</p>
                          )}
                          {ad.style_description && (
                            <div className="mt-1 text-[10px] text-indigo-300 line-clamp-1 flex items-center">
                              <BookOpenIcon className="h-3 w-3 mr-1 inline" />
                              <span className="italic">{ad.style_description}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : searchAdsMutation.isSuccess && selectedAds.length === 0 ? (
              <div className="text-center py-4">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 text-white/50" />
                <p className="text-xs text-white/70">No ads found. Try a different search term.</p>
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            onClick={() => enhancePromptMutation.mutate()}
            disabled={enhancePromptMutation.isPending || !queryText.trim()}
            className="w-full bg-indigo-500/50 hover:bg-indigo-600 text-white text-xs h-8"
          >
            {enhancePromptMutation.isPending ? (
              <>
                <span>Enhancing prompt</span>
                <div className="ml-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              </>
            ) : (
              <>
                <span>Enhance prompt with competitor insights</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}