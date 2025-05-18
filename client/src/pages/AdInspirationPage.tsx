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
import { FaGoogle, FaFacebook } from 'react-icons/fa';

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
    <div className={`p-4 rounded-xl mb-4 overflow-hidden transition-all border border-white/30 bg-white/20 backdrop-blur-md ${isSelected ? 'ring-2 ring-primary/50' : ''}`}>
      <div className="pb-2 mb-2 border-b border-white/20">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg flex items-center text-white">
              {ad.brand}
              <Badge variant="outline" className="ml-2 text-xs bg-white/10 text-white border-white/20">
                {ad.platform}
              </Badge>
              {ad.platform_details && (
                <Badge variant="secondary" className="ml-2 text-xs bg-white/5 text-white/80">
                  {ad.platform_details}
                </Badge>
              )}
            </h3>
          </div>
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onToggleSelect()}
            className="h-5 w-5 bg-white/10 border-white/20"
          />
        </div>
      </div>
      
      <div className="pb-2">
        {ad.image_url && (
          <div className="relative mb-3 rounded-md overflow-hidden bg-black/20 border border-white/10">
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
          <div className="font-medium text-base mb-1 text-white">{ad.headline}</div>
        )}
        
        {ad.body && (
          <div className="text-sm text-white/70 mb-3">{ad.body}</div>
        )}
        
        {ad.cta && (
          <Badge variant="secondary" className="mb-2 bg-white/10 text-white/90 border-white/10">
            {ad.cta}
          </Badge>
        )}
        
        {ad.style_description && (
          <div className="mt-3 p-2 bg-white/5 rounded-md text-xs border border-white/10">
            <div className="font-medium mb-1 text-white/90">Style Analysis:</div>
            <div className="text-white/70">{ad.style_description}</div>
          </div>
        )}
      </div>
      
      <div className="flex justify-between pt-2 border-t border-white/10">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onToggleSelect()}
          className="text-white/80 hover:text-white hover:bg-white/10"
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
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
        )}
      </div>
    </div>
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
      
      return response as SearchResults;
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
      
      return response;
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
    <div className="min-h-screen">
      <div className="flex flex-col h-[calc(100vh-2rem)] mx-auto">
        <header className="py-4 px-6 backdrop-blur-md bg-white/20 border-b border-white/30">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Ad Inspiration Explorer</h1>
              <p className="text-white/90 text-sm">
                Search for competitor ads and generate copywriting inspiration
              </p>
            </div>
            <div className="pill-nav">
              <button 
                className={`pill-nav-item ${currentTab === 'search' ? 'active' : ''}`}
                onClick={() => setCurrentTab('search')}
              >
                <Search className="h-3.5 w-3.5 mr-1.5" />
                <span className="text-xs">Search</span>
              </button>
              <button 
                className={`pill-nav-item ${currentTab === 'inspiration' ? 'active' : ''}`}
                onClick={() => setCurrentTab('inspiration')}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                <span className="text-xs">Inspiration</span>
              </button>
              <button 
                className={`pill-nav-item ${currentTab === 'history' ? 'active' : ''}`}
                onClick={() => setCurrentTab('history')}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                <span className="text-xs">History</span>
              </button>
            </div>
          </div>
        </header>
      
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md">
          {/* Search form in main content when Search tab is active */}
          {currentTab === 'search' && (
            <div className="mb-6">
              <div className="p-5 mb-6 rounded-xl border border-white/30 bg-gradient-to-r from-white/30 to-white/20 backdrop-blur-md shadow-lg">
                <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[180px]">
                    <label htmlFor="searchType" className="text-xs font-medium text-white mb-1 block">
                      Search Type
                    </label>
                    <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
                      <SelectTrigger className="bg-white/30 border-white/40 text-white text-sm h-9 hover:bg-white/40 transition-all">
                        <SelectValue placeholder="Select search type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brand">Brand Name</SelectItem>
                        <SelectItem value="keyword">Keyword</SelectItem>
                        <SelectItem value="industry">Industry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-[2] min-w-[250px]">
                    <label htmlFor="searchQuery" className="text-xs font-medium text-white mb-1 block">
                      Search Query
                    </label>
                    <Input
                      id="searchQuery"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        searchType === 'brand' 
                          ? 'e.g. Nike, Coca-Cola' 
                          : searchType === 'industry'
                            ? 'e.g. Fitness, Healthcare'
                            : 'e.g. running shoes, weight loss'
                      }
                      className="bg-white/30 border-white/40 text-white text-sm h-9 hover:bg-white/40 transition-all focus:ring-2 focus:ring-white/40"
                    />
                  </div>
                  
                  <div className="flex space-x-4 items-center">
                    <div className="flex items-center space-x-2 bg-white/30 rounded-full px-3 py-1.5 border border-white/40">
                      <Checkbox 
                        id="platform-meta" 
                        checked={platforms.includes('meta')}
                        onCheckedChange={() => togglePlatform('meta')}
                        className="bg-white/30 border-white/40 h-4 w-4"
                      />
                      <FaFacebook className="h-3 w-3 text-blue-400" />
                      <label 
                        htmlFor="platform-meta" 
                        className="text-xs font-medium text-white"
                      >
                        Meta
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 bg-white/30 rounded-full px-3 py-1.5 border border-white/40">
                      <Checkbox 
                        id="platform-google" 
                        checked={platforms.includes('google')}
                        onCheckedChange={() => togglePlatform('google')}
                        className="bg-white/30 border-white/40 h-4 w-4"
                      />
                      <FaGoogle className="h-3 w-3 text-red-400" />
                      <label 
                        htmlFor="platform-google" 
                        className="text-xs font-medium text-white"
                      >
                        Google
                      </label>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className={`relative overflow-hidden transition-all duration-300 bg-gradient-to-r from-blue-500/80 to-indigo-500/80 border border-white/20 hover:from-blue-500/90 hover:to-indigo-500/90 text-white rounded-lg px-4 h-9 ${searchMutation.isPending ? 'animate-pulse' : ''}`}
                    disabled={searchMutation.isPending || !searchQuery.trim()}
                  >
                    <span className={`flex items-center transition-transform duration-300 ${searchMutation.isPending ? 'scale-110' : ''}`}>
                      {searchMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Search
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 transform translate-x-full animate-border-beam"></span>
                  </Button>
                </form>
              </div>
            </div>
          )}
          
          {/* Results toolbar for search tab */}
          {currentTab === 'search' && searchMutation.data?.ads && searchMutation.data.ads.length > 0 && (
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/20">
              <h2 className="text-lg font-medium text-white">Results ({searchMutation.data.ads.length})</h2>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAds([])}
                  disabled={selectedAds.length === 0}
                  className="bg-white/20 hover:bg-white/30 border-white/30 text-white text-xs"
                >
                  Clear Selection
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => inspirationMutation.mutate()}
                  disabled={selectedAds.length === 0 || inspirationMutation.isPending}
                  className="bg-white/20 hover:bg-white/30 text-white text-xs border border-white/30"
                >
                  {inspirationMutation.isPending ? (
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3 w-3 mr-1" />
                  )}
                  Generate Inspiration
                </Button>
              </div>
            </div>
          )}
          
          {/* Loading skeletons */}
          {searchMutation.isPending && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="p-4 rounded-xl border border-white/30 bg-white/20 backdrop-blur-md">
                  <div className="pb-2 border-b border-white/20 mb-3">
                    <Skeleton className="h-6 w-40 bg-white/20" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-[160px] w-full bg-white/20" />
                    <Skeleton className="h-4 w-full bg-white/20" />
                    <Skeleton className="h-4 w-3/4 bg-white/20" />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Empty search state */}
          {currentTab === 'search' && !searchMutation.isPending && (!searchMutation.data || !searchMutation.data.ads || searchMutation.data.ads.length === 0) && (
            <div className="text-center py-12 border border-white/30 bg-white/20 backdrop-blur-md rounded-xl h-full flex flex-col items-center justify-center">
              <Search className="mx-auto h-12 w-12 text-white opacity-40 mb-4" />
              <h3 className="text-lg font-medium mb-2 text-white">No Results Yet</h3>
              <p className="text-white/90 max-w-md mx-auto">
                {searchMutation.isError
                  ? 'An error occurred while searching. Please try again.'
                  : 'Search for competitor ads to see results here. Try specific brand names or relevant keywords for your industry.'}
              </p>
            </div>
          )}
          
          {/* Search results */}
          {currentTab === 'search' && !searchMutation.isPending && searchMutation.data?.ads && searchMutation.data.ads.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          
          {/* Inspiration tab content */}
          {currentTab === 'inspiration' && (
            <div className="p-6 rounded-xl border border-white/30 bg-white/20 backdrop-blur-md">
              <h2 className="text-lg font-medium mb-4 text-white">Inspiration from Selected Ads</h2>
              <div className="text-white/90 text-sm mb-6">
                Use these insights to inspire your ad copy and design
              </div>
              
              {!copiedText ? (
                <div className="text-center py-12 bg-white/10 rounded-lg border border-white/20">
                  <p className="text-white/80 mb-4">
                    No inspiration generated yet. Select ads and click "Generate Inspiration" to create content.
                  </p>
                  <Button 
                    onClick={() => setCurrentTab('search')}
                    className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
                  >
                    Go to Search
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <ScrollArea className="h-[400px] w-full rounded-md border border-white/30 p-4 bg-white/10">
                    <div className="whitespace-pre-wrap font-mono text-sm text-white/90">
                      {copiedText}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => copyToClipboard(copiedText)}
                      className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* History tab content */}
          {currentTab === 'history' && (
            <div className="p-6 rounded-xl border border-white/30 bg-white/20 backdrop-blur-md">
              <h2 className="text-lg font-medium mb-4 text-white">Recent Searches</h2>
              <div className="text-white/90 text-sm mb-6">
                Your previous competitor ad searches
              </div>
              <div className="text-center py-12 bg-white/10 rounded-lg border border-white/20">
                <p className="text-white/80 mb-4">
                  Search history feature coming soon...
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}