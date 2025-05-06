/**
 * Google Ads API Service
 * Uses Google OAuth to access the Google Ads API
 */

import { google } from 'googleapis';
import { getGoogleClient } from './googleOAuth';
import { CompetitorAd, InsertCompetitorAd } from '@shared/schema';
import { db } from '../db';
import { competitorAds } from '@shared/schema';

// Google Custom Search Engine ID
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID || '';

interface GoogleAdData {
  brand: string;
  headline?: string;
  body?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  cta?: string;
  adId?: string;
  platformDetails?: string;
  lastSeen?: string;
  advertiserId?: string;
}

interface SearchOptions {
  queryType?: 'brand' | 'keyword' | 'industry';
  userId?: number;
  maxAds?: number;
  region?: string;
}

/**
 * Search for ads for a specific advertiser using Google's Custom Search API with OAuth
 */
export async function getGoogleAdsForAdvertiser(
  advertiser: string,
  options: SearchOptions = {}
): Promise<GoogleAdData[]> {
  const region = options.region || 'US';
  const maxAds = options.maxAds || 20;
  
  console.log(`Searching Google Ads for advertiser: ${advertiser} in region: ${region}`);
  
  try {
    // Get a custom search client with OAuth
    const customsearch = google.customsearch('v1');
    const { auth } = await getGoogleClient();
    
    if (!GOOGLE_CSE_ID) {
      console.warn('Google Custom Search Engine ID not configured.');
      return [];
    }
    
    // Construct search query
    const searchQuery = `${advertiser} ads`;
    
    // Execute search
    const searchResponse = await customsearch.cse.list({
      auth: auth,
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
      const adId = `google-${advertiser.replace(/\\s+/g, '-').toLowerCase()}-${index}`;
      
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
        advertiserId: advertiser.replace(/\\s+/g, '-').toLowerCase()
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
      style_description: null, // This will be generated later
      created_at: new Date()
    };
    
    return competitorAd;
  });
}

/**
 * Save fetched Google ads to the database
 */
export async function saveGoogleAds(googleAds: GoogleAdData[], userId?: number, industry?: string): Promise<CompetitorAd[]> {
  if (googleAds.length === 0) {
    return [];
  }
  
  try {
    // Transform the Google ad data to our format
    const transformedAds = transformGoogleAds(googleAds, userId, industry);
    
    // Save the ads to the database
    const savedAds = await db.insert(competitorAds).values(transformedAds).returning();
    
    return savedAds;
  } catch (error) {
    console.error('Error saving Google ads to database:', error);
    throw new Error(`Failed to save Google ads: ${(error as Error).message}`);
  }
}

/**
 * Find relevant advertisers for a given industry or keyword
 * Using a simple mapping between industries and known advertisers
 */
export function findRelevantAdvertisers(query: string): string[] {
  // Simple industry to advertisers mapping
  const industryMap: Record<string, string[]> = {
    'fashion': ['Nike', 'Adidas', 'Zara', 'H&M', 'Gucci'],
    'technology': ['Apple', 'Samsung', 'Google', 'Microsoft', 'Intel'],
    'food': ['McDonalds', 'Subway', 'KFC', 'Coca-Cola', 'PepsiCo'],
    'automotive': ['Toyota', 'Ford', 'BMW', 'Tesla', 'Honda'],
    'beauty': ['Loreal', 'Estee Lauder', 'Sephora', 'Maybelline', 'Nivea'],
    'furniture': ['IKEA', 'Ashley Furniture', 'Wayfair', 'West Elm', 'Crate and Barrel'],
    'travel': ['Expedia', 'Booking.com', 'Airbnb', 'TripAdvisor', 'Delta'],
    'finance': ['Chase', 'Bank of America', 'Wells Fargo', 'American Express', 'Visa'],
    'insurance': ['Geico', 'State Farm', 'Progressive', 'Allstate', 'Liberty Mutual'],
    'telecom': ['Verizon', 'AT&T', 'T-Mobile', 'Comcast', 'Vodafone'],
    'entertainment': ['Netflix', 'Disney', 'HBO', 'Spotify', 'Amazon Prime'],
    'ecommerce': ['Amazon', 'eBay', 'Walmart', 'Shopify', 'Etsy'],
    'healthcare': ['CVS', 'Walgreens', 'UnitedHealth', 'Pfizer', 'Johnson & Johnson'],
    'education': ['Coursera', 'Udemy', 'Khan Academy', 'edX', 'LinkedIn Learning']
  };
  
  // Normalized query
  const normalizedQuery = query.toLowerCase().trim();
  
  // Check if query matches an industry directly
  for (const [industry, advertisers] of Object.entries(industryMap)) {
    if (normalizedQuery.includes(industry) || industry.includes(normalizedQuery)) {
      return advertisers;
    }
  }
  
  // If query is a brand, return it
  if (normalizedQuery.length > 2) {
    const allAdvertisers = Object.values(industryMap).flat();
    const matchingAdvertisers = allAdvertisers.filter(advertiser => 
      advertiser.toLowerCase().includes(normalizedQuery) || 
      normalizedQuery.includes(advertiser.toLowerCase())
    );
    
    if (matchingAdvertisers.length > 0) {
      return matchingAdvertisers;
    }
  }
  
  // Default: return a few popular advertisers
  return ['Nike', 'Apple', 'Coca-Cola', 'Amazon', 'Starbucks'];
}

/**
 * Search for ads using Google Custom Search API with OAuth
 */
export async function searchGoogleAds(query: string, options: {
  queryType?: 'brand' | 'keyword' | 'industry';
  userId?: number;
  maxAds?: number;
  region?: string;
}): Promise<CompetitorAd[]> {
  try {
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