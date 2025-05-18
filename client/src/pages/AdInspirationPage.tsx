import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Copy, XCircle, Check, ExternalLink, RefreshCw } from 'lucide-react';

// Define the interface for a competitor ad
interface CompetitorAd {
  id: number;
  platform: string;
  brand: string;
  headline: string | null;
  body: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  cta: string | null;
  style_description: string | null;
  platform_details: string | null;
}

// Define the interface for search results
interface SearchResults {
  ads: CompetitorAd[];
  searchId: number;
}

// Component for displaying a single ad card
const AdCard = ({ 
  ad, 
  isSelected, 
  onToggleSelect 
}: { 
  ad: CompetitorAd; 
  isSelected: boolean;
  onToggleSelect: () => void;
}) => {
  return (
    <Card className={`mb-4 overflow-hidden transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center">
              {ad.brand}
              <Badge variant="outline" className="ml-2 text-xs">
                {ad.platform}
              </Badge>
              {ad.platform_details && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {ad.platform_details}
                </Badge>
              )}
            </CardTitle>
          </div>
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onToggleSelect()}
            className="h-5 w-5"
          />
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        {ad.image_url && (
          <div className="relative mb-3 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img 
              src={ad.image_url} 
              alt={`${ad.brand} ad`} 
              className="w-full h-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = ad.thumbnail_url || '';
                (e.target as HTMLImageElement).onerror = null;
              }} 
            />
          </div>
        )}
        
        {ad.headline && (
          <div className="font-medium text-base mb-1">{ad.headline}</div>
        )}
        
        {ad.body && (
          <div className="text-sm text-muted-foreground mb-3">{ad.body}</div>
        )}
        
        {ad.cta && (
          <Badge variant="secondary" className="mb-2">
            {ad.cta}
          </Badge>
        )}
        
        {ad.style_description && (
          <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-md text-xs">
            <div className="font-medium mb-1">Style Analysis:</div>
            <div className="text-muted-foreground">{ad.style_description}</div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onToggleSelect()}
        >
          {isSelected ? (
            <>
              <XCircle className="h-4 w-4 mr-1" />
              Deselect
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Select
            </>
          )}
        </Button>
        
        {ad.headline && ad.body && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(`${ad.headline}\n\n${ad.body}`);
            }}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

// Main Ad Inspiration Page component
export default function AdInspirationPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'brand' | 'keyword' | 'industry'>('keyword');
  const [platforms, setPlatforms] = useState<string[]>(['meta', 'google']);
  const [selectedAds, setSelectedAds] = useState<number[]>([]);
  const [currentTab, setCurrentTab] = useState('search');
  const [copiedText, setCopiedText] = useState('');
  
  // Search for competitor ads
  const searchMutation = useMutation({
    mutationFn: async () => {
      if (!searchQuery.trim()) {
        throw new Error('Search query is required');
      }
      
      // Verwendet jetzt die POST-Methode wie das CompetitorInspirationPanel
      const response = await apiRequest(
        'POST', 
        '/api/ad-inspiration/search',
        {
          query: searchQuery,
          queryType: searchType,
          platforms: platforms,
          limit: 20
        }
      );
      
      return response.json() as Promise<SearchResults>;
    },
    onSuccess: (data) => {
      if (data.ads && data.ads.length > 0) {
        toast({
          title: 'Search complete',
          description: `Found ${data.ads.length} competitor ads matching "${searchQuery}"`,
        });
      } else {
        toast({
          title: 'No ads found',
          description: `No ads found for "${searchQuery}". Try a different search term.`,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Search failed',
        description: `Error searching for competitor ads: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });
  
  // Generate copywriting inspiration from selected ads
  const inspirationMutation = useMutation({
    mutationFn: async () => {
      if (selectedAds.length === 0) {
        throw new Error('No ads selected');
      }
      
      const response = await apiRequest('POST', '/api/ad-inspiration/analyze', {
        adIds: selectedAds
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.copyInspirations) {
        setCopiedText(data.copyInspirations);
        setCurrentTab('inspiration');
        toast({
          title: 'Inspiration generated',
          description: `Generated inspiration from ${selectedAds.length} selected ads`,
        });
      } else {
        toast({
          title: 'No inspiration found',
          description: 'Could not generate useful inspiration from selected ads',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to generate inspiration',
        description: `Error generating inspiration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  });
  
  // Toggle ad selection
  const toggleSelectAd = (adId: number) => {
    setSelectedAds(prev => 
      prev.includes(adId) 
        ? prev.filter(id => id !== adId) 
        : [...prev, adId]
    );
  };
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchMutation.mutate();
  };
  
  // Handle platform selection
  const togglePlatform = (platform: string) => {
    setPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };
  
  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'Text copied to clipboard successfully',
    });
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-2">Ad Inspiration Explorer</h1>
      <p className="text-muted-foreground mb-8">
        Search for competitor ads and generate copywriting and design inspiration
      </p>
      
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="search">Search Ads</TabsTrigger>
          <TabsTrigger value="inspiration">Inspiration</TabsTrigger>
          <TabsTrigger value="history">Search History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="search" className="space-y-6">
          {/* Search Form */}
          <Card>
            <CardHeader>
              <CardTitle>Search for Competitor Ads</CardTitle>
              <CardDescription>
                Find ads from competitors or industry leaders to inspire your designs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="searchType" className="text-sm font-medium">
                    Search Type
                  </label>
                  <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select search type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brand">Brand Name</SelectItem>
                      <SelectItem value="keyword">Keyword</SelectItem>
                      <SelectItem value="industry">Industry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <label htmlFor="searchQuery" className="text-sm font-medium">
                    Search Query
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      id="searchQuery"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        searchType === 'brand' 
                          ? 'e.g. Nike, Coca-Cola, Tesla' 
                          : searchType === 'industry'
                            ? 'e.g. Fitness, Healthcare, Finance'
                            : 'e.g. running shoes, weight loss, investment'
                      }
                      className="flex-1"
                    />
                    <Button type="submit" disabled={searchMutation.isPending || !searchQuery.trim()}>
                      {searchMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Search
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium">Platforms</label>
                  <div className="flex space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="platform-meta" 
                        checked={platforms.includes('meta')}
                        onCheckedChange={() => togglePlatform('meta')}
                      />
                      <label 
                        htmlFor="platform-meta" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Meta (Facebook/Instagram)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="platform-google" 
                        checked={platforms.includes('google')}
                        onCheckedChange={() => togglePlatform('google')}
                      />
                      <label 
                        htmlFor="platform-google" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Google Ads
                      </label>
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
          
          {/* Results */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Results</h2>
              
              {searchMutation.data?.ads && searchMutation.data.ads.length > 0 && (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAds([])}
                    disabled={selectedAds.length === 0}
                  >
                    Clear Selection
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => inspirationMutation.mutate()}
                    disabled={selectedAds.length === 0 || inspirationMutation.isPending}
                  >
                    {inspirationMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Generate Inspiration
                  </Button>
                </div>
              )}
            </div>
            
            {searchMutation.isPending && (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="mb-4">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-[200px] w-full mb-4" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {!searchMutation.isPending && (!searchMutation.data || !searchMutation.data.ads || searchMutation.data.ads.length === 0) && (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <Search className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {searchMutation.isError
                    ? 'An error occurred while searching. Please try again.'
                    : 'Search for competitor ads to see results here. Try specific brand names or relevant keywords for your industry.'}
                </p>
              </div>
            )}
            
            {!searchMutation.isPending && searchMutation.data?.ads && searchMutation.data.ads.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchMutation.data.ads.map(ad => (
                  <AdCard
                    key={ad.id}
                    ad={ad}
                    isSelected={selectedAds.includes(ad.id)}
                    onToggleSelect={() => toggleSelectAd(ad.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="inspiration">
          <Card>
            <CardHeader>
              <CardTitle>Inspiration from Selected Ads</CardTitle>
              <CardDescription>
                Use these insights to inspire your ad copy and design
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!copiedText ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No inspiration generated yet. Select ads and click "Generate Inspiration" to create content.
                  </p>
                  <Button onClick={() => setCurrentTab('search')}>
                    Go to Search
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                    <div className="whitespace-pre-wrap font-mono text-sm">
                      {copiedText}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => copyToClipboard(copiedText)}
                      className="min-w-[120px]"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Search History</CardTitle>
              <CardDescription>
                Your recent ad searches and results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12 text-muted-foreground">
                Search history feature coming soon. This will show your recent searches and let you quickly revisit them.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}