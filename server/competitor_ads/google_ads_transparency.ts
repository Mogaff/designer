/**
 * Google Ads API Implementation
 * Handles fetching competitor ads from Google's Search results
 */

import { google } from 'googleapis';
import { CompetitorAd, InsertCompetitorAd } from '@shared/schema';
import { db } from '../db';
import { competitorAds } from '@shared/schema';

// Configure Google Custom Search API
// These should be set as environment variables in a production environment
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

// Check if API key is available
const isGoogleSearchConfigured = !!GOOGLE_API_KEY && !!GOOGLE_CSE_ID;

interface GoogleAdData {
  brand: string;
  headline?: string;
  body?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  cta?: string;
  adId?: string;
  platformDetails?: string; // YouTube, Search, Display, etc.
  lastSeen?: string;
  advertiserId?: string;
}

interface SearchOptions {
  region?: string;
  maxAds?: number;
  timeout?: number;
}

/**
 * Search for ads for a specific advertiser using Google's Custom Search API
 */
export async function getGoogleAdsForAdvertiser(
  advertiser: string,
  options: SearchOptions = {}
): Promise<GoogleAdData[]> {
  const region = options.region || 'US';
  const maxAds = options.maxAds || 20;
  
  console.log(`Searching Google Ads for advertiser: ${advertiser} in region: ${region}`);
  
  // Check if Google Search API is configured
  if (!isGoogleSearchConfigured) {
    console.warn('Google Custom Search API is not configured. Please set GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables.');
    return [];
  }
  
  try {
    // Initialize Google Custom Search API
    const customsearch = google.customsearch('v1');
    
    // Construct search query
    const searchQuery = `${advertiser} ads`;
    
    // Execute search
    const searchResponse = await customsearch.cse.list({
      auth: GOOGLE_API_KEY,
      cx: GOOGLE_CSE_ID,
      q: searchQuery,
      num: maxAds,
      gl: region, // Geolocation parameter (country code)
      cr: `country${region}` // Country restrict parameter
    });
    
    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      console.log(`No search results found for advertiser: ${advertiser}`);
      return [];
    }
    
    // Transform search results to ad data
    const ads: GoogleAdData[] = searchResponse.data.items.map((item, index) => {
      // Generate a unique ad ID
      const adId = `google-${advertiser.replace(/\s+/g, '-').toLowerCase()}-${index}`;
      
      // Extract image URL if available
      const imageUrl = item.pagemap?.cse_image?.[0]?.src || item.pagemap?.cse_thumbnail?.[0]?.src || null;
      
      return {
        brand: advertiser,
        headline: item.title || undefined,
        body: item.snippet || undefined,
        imageUrl: imageUrl || undefined,
        thumbnailUrl: imageUrl || undefined,
        cta: item.pagemap?.metatags?.[0]?.['og:price:amount'] ? 'Shop Now' : 'Learn More',
        adId,
        platformDetails: 'Search',
        lastSeen: new Date().toISOString().split('T')[0],
        advertiserId: advertiser.replace(/\s+/g, '-').toLowerCase()
      };
    });
    
    console.log(`Found ${ads.length} potential ads for advertiser: ${advertiser}`);
    return ads;
    
  } catch (error) {
    console.error(`Error searching Google ads for advertiser: ${advertiser}`, error);
    // Return empty array instead of throwing to avoid breaking the entire search
    return [];
  }
}

/**
 * Transform Google ad data into our standard Competitor Ad format
 */
export function transformGoogleAds(googleAds: GoogleAdData[], userId?: number, industry?: string): InsertCompetitorAd[] {
  return googleAds.map(ad => {
    // Create the transformed competitor ad
    const competitorAd: InsertCompetitorAd = {
      platform: 'Google',
      brand: ad.brand,
      headline: ad.headline || null,
      body: ad.body || null,
      image_url: ad.imageUrl || null,
      thumbnail_url: ad.thumbnailUrl || null,
      cta: ad.cta || null,
      start_date: null, // Google doesn't provide exact start dates
      platform_details: ad.platformDetails || null,
      ad_id: ad.adId || '',
      page_id: ad.advertiserId || '',
      snapshot_url: '', // Google doesn't provide snapshot URLs
      fetched_by_user_id: userId || null,
      industry: industry || null,
      tags: [], // No tags by default
      is_active: true,
      style_description: null, // We'll generate this separately using AI
      metadata: {
        lastSeen: ad.lastSeen || undefined,
        raw_google_data: ad // Store the original data for reference
      }
    };
    
    return competitorAd;
  });
}

/**
 * Save fetched Google ads to the database
 */
export async function saveGoogleAds(googleAds: GoogleAdData[], userId?: number, industry?: string): Promise<CompetitorAd[]> {
  const transformedAds = transformGoogleAds(googleAds, userId, industry);
  
  if (transformedAds.length === 0) {
    return [];
  }
  
  try {
    console.log(`Saving ${transformedAds.length} Google ads to database`);
    
    // Insert all ads and return the inserted records
    const savedAds = await db.insert(competitorAds).values(transformedAds).returning();
    
    console.log(`Successfully saved ${savedAds.length} Google ads to database`);
    return savedAds;
  } catch (error) {
    console.error('Error saving Google ads to database:', error);
    throw new Error(`Failed to save Google ads to database: ${(error as Error).message}`);
  }
}

/**
 * Find relevant advertisers for a given industry or keyword
 * Using a simple mapping between industries and known advertisers
 */
export function findRelevantAdvertisers(query: string): string[] {
  // Basic industry-to-advertiser mapping
  const industryAdvertisers: Record<string, string[]> = {
    'fitness': ['Nike', 'Adidas', 'Under Armour', 'Peloton', 'Planet Fitness'],
    'tech': ['Apple', 'Microsoft', 'Samsung', 'Google', 'Dell'],
    'food': ['McDonalds', 'Kraft Heinz', 'Kellogg', 'Nestle', 'PepsiCo'],
    'beauty': ['Sephora', 'Maybelline', 'LOreal', 'Fenty Beauty', 'Estee Lauder'],
    'fashion': ['Zara', 'H&M', 'Uniqlo', 'GAP', 'Ralph Lauren'],
    'automotive': ['Toyota', 'Ford', 'Tesla', 'BMW', 'Honda'],
    'travel': ['Expedia', 'Airbnb', 'Booking.com', 'Trip.com', 'Marriott'],
    'finance': ['Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'Capital One'],
    'streaming': ['Netflix', 'Disney+', 'Hulu', 'HBO Max', 'Amazon Prime Video'],
    'ecommerce': ['Amazon', 'Walmart', 'Target', 'eBay', 'Etsy']
  };
  
  // Normalize query
  const normalizedQuery = query.trim().toLowerCase();
  
  // Check if the query exactly matches an industry
  if (normalizedQuery in industryAdvertisers) {
    return industryAdvertisers[normalizedQuery];
  }
  
  // Check if query contains any industry keywords
  for (const [industry, _] of Object.entries(industryAdvertisers)) {
    if (normalizedQuery.includes(industry)) {
      return industryAdvertisers[industry];
    }
  }
  
  // If it's likely a brand name, just return it
  if (!normalizedQuery.includes(' ') && normalizedQuery.length > 2) {
    return [query]; // Assume it's a brand name
  }
  
  // Default: return a few popular advertisers
  return ['Nike', 'Apple', 'Coca-Cola', 'Amazon', 'Starbucks'];
}

/**
 * Check if Google Custom Search API keys are configured
 */
export async function checkGoogleApiKeys(): Promise<boolean> {
  const hasApiKey = !!process.env.GOOGLE_API_KEY;
  const hasCseId = !!process.env.GOOGLE_CSE_ID;
  
  return hasApiKey && hasCseId;
}

/**
 * Search for ads using Google Custom Search API
 */
export async function searchGoogleAds(query: string, options: {
  queryType?: 'brand' | 'keyword' | 'industry';
  userId?: number;
  maxAds?: number;
  region?: string;
}): Promise<CompetitorAd[]> {
  try {
    // Check if Google Custom Search API is configured
    const isConfigured = await checkGoogleApiKeys();
    
    if (!isConfigured) {
      console.warn('Google Custom Search API is not configured. Please configure it in Settings.');
      return [];
    }
    
    let advertisers: string[] = [];
    
    if (options.queryType === 'brand') {
      // For brand queries, use the query directly
      advertisers = [query];
    } else {
      // For keyword/industry queries, find relevant advertisers
      advertisers = findRelevantAdvertisers(query);
    }
    
    console.log(`Searching Google Ads for ${advertisers.length} advertisers related to: ${query}`);
    
    // Limit the number of advertisers to search to avoid long processing times
    const limitedAdvertisers = advertisers.slice(0, 3);
    
    // Create an array to store all ads
    const allAds: CompetitorAd[] = [];
    
    // Search for each advertiser
    for (const advertiser of limitedAdvertisers) {
      try {
        // Get ads for this advertiser using Custom Search API
        const googleAds = await getGoogleAdsForAdvertiser(advertiser, {
          region: options.region,
          maxAds: options.maxAds || 10
        });
        
        // Save the ads to the database
        const savedAds = await saveGoogleAds(
          googleAds, 
          options.userId,
          options.queryType === 'industry' ? query : undefined
        );
        
        // Add the saved ads to our result array
        allAds.push(...savedAds);
        
      } catch (error) {
        console.error(`Error fetching ads for advertiser "${advertiser}":`, error);
        // Continue with the next advertiser
      }
    }
    
    return allAds;
  } catch (error) {
    console.error(`Error searching Google ads for "${query}":`, error);
    throw error;
  }
}