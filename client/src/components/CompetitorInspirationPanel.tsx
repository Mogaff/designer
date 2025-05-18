import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader, Search, Zap, ArrowRight, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CompetitorInspirationPanelProps {
  onEnhancePrompt: (enhancedPrompt: string) => void;
  originalPrompt: string;
  isOpen: boolean;
}

// Interface für Suchergebnisse von Wettbewerber-Anzeigen
// Achtung: Verwende snake_case Felder wie in der API-Antwort
type AdSearchResult = {
  id: number;
  platform: string;
  brand: string;
  headline: string | null;
  body: string | null;
  cta: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  style_description: string | null;
  platform_details: string | null;
};

export default function CompetitorInspirationPanel({
  onEnhancePrompt,
  originalPrompt,
  isOpen
}: CompetitorInspirationPanelProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'brand' | 'keyword' | 'industry'>('keyword');
  const [results, setResults] = useState<AdSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAds, setSelectedAds] = useState<number[]>([]);
  const [googleApiStatus, setGoogleApiStatus] = useState<{
    configured: boolean;
    oauthConfigured?: boolean;
    cseIdConfigured?: boolean;
    message?: string;
    error?: boolean;
    envLimitation?: boolean;
  } | null>(null);

  // Check if Google Search API is configured when component loads
  useEffect(() => {
    const checkGoogleApiStatus = async () => {
      try {
        // Use apiRequest to benefit from its error handling
        const data = await apiRequest('GET', '/api/ad-inspiration/google-search-status', null);
        
        // The server now always returns a 200 status, even for errors
        // So we need to check for error properties in the response
        if (data.error) {
          setGoogleApiStatus({
            configured: false,
            message: data.message || data.error,
            error: true,
            envLimitation: data.envLimitation
          });
        } else {
          setGoogleApiStatus(data);
        }
      } catch (error) {
        // This block should rarely be hit now since server returns 200 status
        console.error('Error checking Google Search API status:', error);
        setGoogleApiStatus({
          configured: false,
          message: error instanceof Error ? error.message : 'Error checking Google Search API status',
          error: true
        });
      }
    };
    
    checkGoogleApiStatus();
  }, []);
  
  // Search for competitor ads
  const searchMutation = useMutation({
    mutationFn: async (searchData: { query: string; type: string }) => {
      // The apiRequest function already handles error checking and JSON parsing
      return apiRequest(
        'POST', 
        '/api/ad-inspiration/search',
        {
          query: searchData.query,
          queryType: searchData.type,
          platforms: ['meta', 'google'],
          limit: 10
        }
      );
    },
    onSuccess: (data) => {
      setIsSearching(false);
      
      // Check for Google API specific errors first
      if (data.googleApiError) {
        setResults([]);
        
        // Set a more detailed error status that will be shown in the UI
        setGoogleApiStatus(prev => ({
          ...prev,
          configured: false,
          message: data.warning || "Google Search API is temporarily unavailable in this environment",
          error: true
        }));
        
        toast({
          title: 'Limited search results',
          description: data.warning || "Google Search API unavailable. Using alternative sources only."
        });
        return;
      }
      
      if (data.ads && data.ads.length > 0) {
        setResults(data.ads);
        toast({
          title: 'Search complete',
          description: `Found ${data.count} competitor ads matching "${searchQuery}"`,
        });
      } else {
        setResults([]);
        toast({
          title: 'No ads found',
          description: `No ads found for "${searchQuery}". Try a different search term.`,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      setIsSearching(false);
      
      // Parse the error message to check for specific issues
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let userFriendlyMessage = errorMessage;
      
      // Check for specific error types and provide better messages
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        userFriendlyMessage = 'Network connection error. Please check your internet connection.';
      } else if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'The search request timed out. Please try again later.';
      } else if (errorMessage.includes('OAuth') || errorMessage.includes('Google')) {
        userFriendlyMessage = 'Unable to access Google Search API. Using alternative sources only.';
        
        // Update the Google API status with more details
        setGoogleApiStatus(prev => ({
          ...prev,
          configured: false,
          message: "Google Search API authentication failed",
          error: true
        }));
      }
      
      toast({
        title: 'Search failed',
        description: `Error searching for competitor ads: ${userFriendlyMessage}`,
        variant: 'destructive',
      });
    }
  });
  
  // Enhance the prompt with inspiration from selected ads
  const enhanceMutation = useMutation({
    mutationFn: async (data: { 
      keyword?: string;
      brand?: string;
      industry?: string;
      limit?: number;
    }) => {
      // The apiRequest function already handles error checking and JSON parsing
      return apiRequest('POST', '/api/ad-inspiration/inspire', data);
    },
    onSuccess: (data) => {
      if (data.styleInspiration || data.copyInspiration) {
        // Create an enhanced prompt using the original and the inspiration
        const enhancedPrompt = originalPrompt ? 
          `${originalPrompt}\n\n---- Inspired by competitors ----\n${data.styleInspiration || ''}\n\n${data.copyInspiration || ''}` :
          `${data.styleInspiration || ''}\n\n${data.copyInspiration || ''}`;
        
        // Call the callback with the enhanced prompt
        onEnhancePrompt(enhancedPrompt);
        
        // Display appropriate message based on whether this came from database only
        if (data.googleApiError) {
          toast({
            title: 'Prompt enhanced (limited sources)',
            description: `Enhanced using ${data.count} previously saved competitor ads`,
          });
          
          // Update Google API status to reflect the issue
          setGoogleApiStatus(prev => ({
            ...prev!,
            configured: false,
            message: data.message || "Google Search API unavailable. Using database results only.",
            envLimitation: true
          }));
        } else {
          toast({
            title: 'Prompt enhanced',
            description: `Enhanced your prompt with inspiration from ${data.count} competitor ads`,
          });
        }
      } else {
        toast({
          title: 'No inspiration found',
          description: 'Could not find useful inspiration from competitor ads',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      // Parse the error message to check for specific issues
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let userFriendlyMessage = errorMessage;
      
      // Check for specific error types and provide better messages
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        userFriendlyMessage = 'Network connection error. Please check your internet connection.';
      } else if (errorMessage.includes('timeout')) {
        userFriendlyMessage = 'The request timed out. Please try again later.';
      } else if (errorMessage.includes('OAuth') || errorMessage.includes('Google')) {
        userFriendlyMessage = 'Unable to access Google Search API. Using alternative sources only.';
        
        // Update the Google API status with more details
        setGoogleApiStatus(prev => ({
          ...prev,
          configured: false,
          message: "Google Search API authentication failed", 
          error: true
        }));
      } else if (errorMessage.includes('Found 0 ads')) {
        userFriendlyMessage = 'No suitable competitor ads found for inspiration. Try a different search term.';
      }
      
      toast({
        title: 'Failed to enhance prompt',
        description: `Error enhancing prompt: ${userFriendlyMessage}`,
        variant: 'destructive',
      });
    }
  });
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast({
        title: 'Empty search',
        description: 'Please enter a search term',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSearching(true);
    setResults([]);
    searchMutation.mutate({ 
      query: searchQuery.trim(),
      type: searchType
    });
  };
  
  // Toggle ad selection
  const toggleSelectAd = (adId: number) => {
    setSelectedAds(prev => 
      prev.includes(adId) 
        ? prev.filter(id => id !== adId) 
        : [...prev, adId]
    );
  };
  
  // Get quick inspiration based on the current search query
  const getQuickInspiration = () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'No search term',
        description: 'Please enter a search term first',
        variant: 'destructive',
      });
      return;
    }
    
    const data: any = { limit: 5 };
    
    // Map the search type to the API parameter
    if (searchType === 'keyword') {
      data.keyword = searchQuery.trim();
    } else if (searchType === 'brand') {
      data.brand = searchQuery.trim();
    } else if (searchType === 'industry') {
      data.industry = searchQuery.trim();
    }
    
    enhanceMutation.mutate(data);
  };
  
  // Only show the component when it's open (this is controlled by the parent)
  if (!isOpen) return null;
  
  return (
    <div className="flex flex-col gap-1 text-white">
      <h3 className="text-[10px] font-medium flex items-center gap-1">
        <Lightbulb className="h-2 w-2 text-amber-400" />
        Competitor Ad Inspiration
      </h3>
      
      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-5 bg-white/10 backdrop-blur-md shadow-sm border border-white/10 rounded-md p-0.5 gap-1">
          <TabsTrigger value="search" className="text-[8px] h-4 rounded-sm data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-sm">Search Ads</TabsTrigger>
          <TabsTrigger value="quick" className="text-[8px] h-4 rounded-sm data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-sm">Quick Inspiration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="search" className="mt-1">
          <form onSubmit={handleSearch} className="flex gap-1 mb-1">
            <div className="flex-1 relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search competitor ads..."
                className="h-5 text-[8px] py-0 px-2 bg-white/10 backdrop-blur-md border-white/10 text-white placeholder:text-white/40 rounded-full"
              />
            </div>
            <div>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as any)}
                className="h-5 text-[8px] py-0 px-1.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white"
              >
                <option value="keyword">Keyword</option>
                <option value="brand">Brand</option>
                <option value="industry">Industry</option>
              </select>
            </div>
            <Button 
              type="submit" 
              className="h-5 w-5 p-0 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md hover:bg-white/15"
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? <Loader className="h-2 w-2 animate-spin" /> : <Search className="h-2.5 w-2.5" />}
            </Button>
          </form>
          
          {/* Google API warning */}
          {googleApiStatus && !googleApiStatus.configured && (
            <div className={`mb-1 p-1 text-[8px] rounded ${
              googleApiStatus.envLimitation 
                ? 'text-blue-300 bg-blue-500/20 border border-blue-500/30' 
                : 'text-amber-300 bg-amber-500/20 border border-amber-500/30'
            }`}>
              {googleApiStatus.envLimitation ? (
                <>
                  <strong>Environment limitation:</strong>{' '}
                  {googleApiStatus.message || 'Google Search API is not available in this environment.'}
                </>
              ) : (
                <>
                  <strong>Google Search API not fully configured.</strong>{' '}
                  {googleApiStatus.message || 'Some search results may be limited.'}
                  {googleApiStatus.cseIdConfigured === false && ' Custom Search Engine ID needed.'}
                  <a href="/settings" className="underline ml-1">Configure in Settings</a>
                </>
              )}
            </div>
          )}
            
          {/* Results section */}
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {results.length === 0 && !isSearching && (
              <p className="text-[8px] text-center text-white/60 py-1">
                Search for competitor ads to get inspiration
              </p>
            )}
            
            {isSearching && (
              <div className="flex items-center justify-center py-2">
                <Loader className="h-3 w-3 animate-spin text-indigo-400" />
                <span className="ml-1 text-[8px] text-white/60">Searching...</span>
              </div>
            )}
            
            {results.map((ad) => (
              <div 
                key={ad.id} 
                className={`p-1 rounded border ${
                  selectedAds.includes(ad.id) 
                    ? 'border-indigo-500/40 bg-indigo-500/20 backdrop-blur-md' 
                    : 'border-white/10 bg-white/5 backdrop-blur-md'
                } cursor-pointer`}
                onClick={() => toggleSelectAd(ad.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-[8px] font-medium">{ad.brand}</h4>
                    <p className="text-[7px] text-white/70">{ad.headline || ad.body?.substring(0, 50) || 'No text'}</p>
                  </div>
                  {ad.image_url && (
                    <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0 bg-black/20">
                      <img 
                        src={ad.image_url} 
                        alt={ad.brand} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Versuche es mit dem Thumbnail, falls das Hauptbild nicht lädt
                          if (ad.thumbnail_url) {
                            (e.target as HTMLImageElement).src = ad.thumbnail_url;
                            (e.target as HTMLImageElement).onerror = () => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            };
                          } else {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Actions */}
          {results.length > 0 && (
            <div className="flex justify-between mt-1">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-5 text-[8px] py-0 px-1 border-white/10 text-white/80 bg-white/5 backdrop-blur-md"
                onClick={() => setSelectedAds(results.map(ad => ad.id))}
              >
                Select All
              </Button>
              <Button 
                size="sm" 
                className="h-5 text-[8px] py-0 px-1 bg-indigo-500/80 hover:bg-indigo-500"
                disabled={selectedAds.length === 0}
                onClick={() => {
                  enhanceMutation.mutate({
                    keyword: searchType === 'keyword' ? searchQuery : undefined,
                    brand: searchType === 'brand' ? searchQuery : undefined,
                    industry: searchType === 'industry' ? searchQuery : undefined,
                  });
                }}
              >
                <ArrowRight className="h-2 w-2 mr-0.5" />
                Enhance Prompt
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="quick" className="space-y-1 mt-1">
          <p className="text-[8px] text-white/70">
            Get instant inspiration from competitor ads without reviewing individual results
          </p>
          
          {/* Google API warning for quick tab */}
          {googleApiStatus && !googleApiStatus.configured && (
            <div className={`mb-1 p-1 text-[8px] rounded ${
              googleApiStatus.envLimitation 
                ? 'text-blue-300 bg-blue-500/20 border border-blue-500/30' 
                : 'text-amber-300 bg-amber-500/20 border border-amber-500/30'
            }`}>
              {googleApiStatus.envLimitation ? (
                <>
                  <strong>Environment limitation:</strong>{' '}
                  {googleApiStatus.message || 'Google Search API is not available in this environment.'}
                </>
              ) : (
                <>
                  <strong>Google Search API not fully configured.</strong>{' '}
                  {googleApiStatus.message || 'Inspiration results may be limited.'}
                  {googleApiStatus.cseIdConfigured === false && ' Custom Search Engine ID needed.'}
                  <a href="/settings" className="underline ml-1">Configure in Settings</a>
                </>
              )}
            </div>
          )}
          
          <div className="flex gap-1">
            <div className="flex-1 relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter brand, keyword, or industry..."
                className="h-5 text-[8px] py-0 px-2 bg-white/10 backdrop-blur-md border-white/10 text-white placeholder:text-white/40 rounded-full"
              />
            </div>
            <div>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as any)}
                className="h-5 text-[8px] py-0 px-1.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white"
              >
                <option value="keyword">Keyword</option>
                <option value="brand">Brand</option>
                <option value="industry">Industry</option>
              </select>
            </div>
          </div>
          
          <Button 
            onClick={getQuickInspiration}
            className="w-full h-5 text-[8px] py-0 rounded-full bg-indigo-500/50 hover:bg-indigo-500/70"
            disabled={enhanceMutation.isPending || !searchQuery.trim()}
          >
            {enhanceMutation.isPending ? (
              <Loader className="h-2 w-2 animate-spin mr-1" />
            ) : (
              <Zap className="h-2 w-2 mr-1" />
            )}
            Get Quick Inspiration
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}