/**
 * Google Ads Transparency Center API Client
 * Handles fetching competitor ads from Google's Ads Transparency Center
 * Using direct XHR requests to the internal API endpoints
 */

import { CompetitorAd, InsertCompetitorAd } from '@shared/schema';
import { db } from '../db';
import { competitorAds } from '@shared/schema';
import axios from 'axios';

// Google Ads Transparency Center URLs
const GOOGLE_ADS_TRANSPARENCY_URL = 'https://adstransparency.google.com';
const GOOGLE_ADS_API_URL = 'https://adstransparency.google.com/_/adstransparencybackend/data';

interface GoogleAdData {
  brand: string;
  headline?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  cta?: string | null;
  adId?: string;
  platformDetails?: string | null; // YouTube, Search, Display, etc.
  lastSeen?: string | null;
  advertiserId?: string;
  rawData?: any; // For storing the raw API response data
}

interface ScrapingOptions {
  region?: string;
  maxAds?: number;
  timeout?: number;
}

/**
 * Fetch ads for a specific advertiser from Google's Ads Transparency Center
 * Using direct XHR API requests to the internal JSON API endpoints
 */
export async function scrapeGoogleAdsForAdvertiser(
  searchQuery: string,
  options: ScrapingOptions & {
    searchType?: 'brand' | 'keyword' | 'industry';
  } = {}
): Promise<GoogleAdData[]> {
  const region = options.region || 'US';
  const maxAds = options.maxAds || 20;
  const timeout = options.timeout || 60000; // 60 seconds
  
  console.log(`Scraping Google Ads for advertiser: ${searchQuery} in region: ${region}`);

  // If this is a direct advertiser ID
  let advertiserId = searchQuery;
  
  // If it's not in the right format, try to find a matching advertiser
  if (!searchQuery.startsWith('AR')) {
    // Clean up the query (lowercase for case-insensitive matching)
    const cleanQuery = searchQuery.toLowerCase().trim();
    
    // Check if we have a known advertiser ID for this query
    const knownId = findRelevantAdvertisers(cleanQuery)[0];
    if (knownId) {
      console.log(`Using known advertiser ID for brand ${cleanQuery}: ${knownId}`);
      advertiserId = knownId;
    } else {
      console.log(`No known advertiser ID for: ${cleanQuery}`);
      return [];
    }
  }

  try {
    // Configure HTTP request to the internal API endpoint
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/json',
      'Origin': GOOGLE_ADS_TRANSPARENCY_URL,
      'Referer': `${GOOGLE_ADS_TRANSPARENCY_URL}/advertiser/${advertiserId}?region=${region}`,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    // Construct the specific API request
    // This directly accesses the internal JSON API that the frontend uses
    const url = `${GOOGLE_ADS_API_URL}/ads?advertiserId=${advertiserId}&region=${region}`;
    console.log(`Fetching ads from internal API: ${url}`);
    
    // Execute API request
    const response = await axios.get(url, {
      headers,
      timeout: timeout,
    });
    
    // Check if we got a valid JSON response
    if (!response.data) {
      console.error(`Failed to fetch ad data: Empty response`);
      return [];
    }

    console.log(`API response received for advertiser: ${advertiserId}`);
    
    // Extract the raw ad data from the response
    // The actual structure depends on Google's internal API format
    let rawAdData: any[] = [];
    
    try {
      // The data may be nested in the response in various ways
      // This is based on inspecting network requests to the Google Ads Transparency Center
      if (Array.isArray(response.data)) {
        rawAdData = response.data;
      } else if (response.data.ads && Array.isArray(response.data.ads)) {
        rawAdData = response.data.ads;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        rawAdData = response.data.data;
      } else if (response.data.data && response.data.data.ads && Array.isArray(response.data.data.ads)) {
        rawAdData = response.data.data.ads;
      } else {
        // If we can't find a clear array, try to extract any objects that look like ads
        const possibleAds = Object.values(response.data).filter(val => 
          typeof val === 'object' && val !== null);
        
        if (possibleAds.length > 0) {
          rawAdData = possibleAds;
        }
      }
    } catch (err) {
      console.error('Error parsing ad data:', err);
    }
    
    // If we still don't have ad data, we need to fall back
    if (rawAdData.length === 0) {
      console.log(`No ad data found in API response for ${advertiserId}`);
      
      // Try a second endpoint format that's sometimes used
      try {
        const alternativeUrl = `${GOOGLE_ADS_API_URL}/advertiser?advertiserId=${advertiserId}&region=${region}`;
        console.log(`Trying alternative API endpoint: ${alternativeUrl}`);
        
        const altResponse = await axios.get(alternativeUrl, {
          headers,
          timeout: timeout,
        });
        
        // Extract advertiser info including ads if available
        if (altResponse.data && altResponse.data.advertiser && altResponse.data.advertiser.ads) {
          rawAdData = altResponse.data.advertiser.ads;
          console.log(`Found ${rawAdData.length} ads from alternative endpoint`);
        } else if (altResponse.data && altResponse.data.data && altResponse.data.data.advertiser && altResponse.data.data.advertiser.ads) {
          rawAdData = altResponse.data.data.advertiser.ads;
          console.log(`Found ${rawAdData.length} ads from nested alternative endpoint data`);
        }
      } catch (altErr) {
        console.error('Error fetching from alternative endpoint:', altErr);
      }
    }
    
    // If we still don't have data, return empty array
    if (rawAdData.length === 0) {
      console.log(`No ad data available for ${advertiserId} after trying all endpoints`);
      return [];
    }
    
    console.log(`Processing ${rawAdData.length} raw ads...`);
    
    // Now map the raw ad data to our GoogleAdData format
    // We need to adapt this based on the actual structure of Google's API response
    const parsedAds: GoogleAdData[] = rawAdData
      .slice(0, maxAds)
      .map((ad: any, index: number) => {
        // First, try to extract values based on likely field names
        // This needs to be adapted based on Google's actual API structure
        const brand = extractValue(ad, ['advertiserName', 'advertiser_name', 'brandName', 'brand', 'name']) || searchQuery;
        const headline = extractValue(ad, ['title', 'headline', 'adTitle', 'adHeadline']);
        const body = extractValue(ad, ['description', 'body', 'text', 'adText', 'content', 'adContent']);
        const imageUrl = extractValue(ad, ['imageUrl', 'image_url', 'adImageUrl', 'mediaUrl', 'creativeUrl']);
        const thumbnailUrl = extractValue(ad, ['thumbnailUrl', 'thumbnail', 'previewUrl']);
        const cta = extractValue(ad, ['callToAction', 'cta', 'button', 'buttonText']);
        const platformDetails = extractValue(ad, ['platform', 'adType', 'adFormat', 'format', 'surface']);
        const lastSeen = extractValue(ad, ['lastSeen', 'last_seen', 'lastShown', 'dateLastSeen']);
        const adId = extractValue(ad, ['id', 'adId', 'ad_id']) || `google-${advertiserId}-${index}`;
        
        return {
          brand,
          headline: headline || null,
          body: body || null,
          imageUrl: imageUrl || null,
          thumbnailUrl: thumbnailUrl || imageUrl || null,
          cta: cta || null,
          adId: adId,
          platformDetails: platformDetails || null,
          lastSeen: lastSeen || null,
          advertiserId: advertiserId,
          // Include the raw data for debugging and future refinement
          rawData: ad
        };
      });
    
    console.log(`Successfully processed ${parsedAds.length} ads for advertiser: ${advertiserId}`);
    
    return parsedAds;
    
  } catch (error) {
    console.error(`Error fetching Google Ads API for advertiser: ${searchQuery}`, error);
    throw new Error(`Failed to fetch from Google Ads Transparency API: ${(error as Error).message}`);
  }
}

/**
 * Helper function to extract values from nested objects using multiple possible keys
 */
function extractValue(obj: any, possibleKeys: string[]): string | null {
  if (!obj || typeof obj !== 'object') {
    return null;
  }
  
  for (const key of possibleKeys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      // Handle various data types
      if (typeof obj[key] === 'string') {
        return obj[key].trim();
      } else if (typeof obj[key] === 'number' || typeof obj[key] === 'boolean') {
        return String(obj[key]);
      } else if (typeof obj[key] === 'object') {
        // If it's an object, check for url, text, or value properties
        if (obj[key].url) return obj[key].url;
        if (obj[key].text) return obj[key].text;
        if (obj[key].value) return obj[key].value;
      }
    }
  }
  
  // Try to look one level deeper for nested properties
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      for (const possibleKey of possibleKeys) {
        if (obj[key][possibleKey] !== undefined && obj[key][possibleKey] !== null) {
          return String(obj[key][possibleKey]).trim();
        }
      }
    }
  }
  
  return null;
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
        lastSeen: ad.lastSeen,
        raw_google_data: ad.rawData || ad // Store the original data for reference
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
 * Using a mapping between industries and known advertisers with their Google Ad IDs
 */
export function findRelevantAdvertisers(query: string): string[] {
  // Viele der größeren Marken haben bekannte IDs in Google's Ads Transparency Center
  // Format: brand name: AR... ID
  const knownAdvertiserIds: Record<string, string> = {
    'nike': 'AR488803513102942208',
    'adidas': 'AR09364018780667904',
    'apple': 'AR467122456588591104',
    'microsoft': 'AR516879332667596800',
    'google': 'AR18054737239162880',
    'amazon': 'AR579308875399675904',
    'samsung': 'AR525636455835475968',
    'coca-cola': 'AR411337481615515648',
    'pepsi': 'AR547005209329508352',
    'mcdonalds': 'AR586780018707562496',
    'starbucks': 'AR01985402131456000',
    'walmart': 'AR476351957455847424',
    'target': 'AR440233347195789312',
    'dell': 'AR440214727474380800',
    'hp': 'AR429055584834387968',
    'ford': 'AR528764493613039616',
    'toyota': 'AR511433172284063744',
    'bmw': 'AR429158019538296832',
    'audi': 'AR18177481359892480',
    'netflix': 'AR492246968245166080',
    'disney': 'AR419608580587913216',
    'hbo': 'AR411378493474922496'
  };
  
  // Industry-to-brand mapping for keywords und Branchen
  const industryAdvertisers: Record<string, string[]> = {
    'fitness': ['nike', 'adidas', 'under armour', 'peloton', 'planet fitness'],
    'tech': ['apple', 'microsoft', 'samsung', 'google', 'dell'],
    'food': ['mcdonalds', 'kraft heinz', 'kellogg', 'nestle', 'pepsi'],
    'beauty': ['sephora', 'maybelline', 'loreal', 'fenty beauty', 'estee lauder'],
    'fashion': ['zara', 'h&m', 'uniqlo', 'gap', 'ralph lauren'],
    'automotive': ['toyota', 'ford', 'tesla', 'bmw', 'audi'],
    'travel': ['expedia', 'airbnb', 'booking.com', 'trip.com', 'marriott'],
    'finance': ['chase', 'bank of america', 'wells fargo', 'citibank', 'capital one'],
    'streaming': ['netflix', 'disney', 'hulu', 'hbo', 'amazon'],
    'ecommerce': ['amazon', 'walmart', 'target', 'ebay', 'etsy']
  };
  
  // Normalize query
  const normalizedQuery = query.trim().toLowerCase();
  
  // Direct match with known advertiser ID
  if (normalizedQuery in knownAdvertiserIds) {
    console.log(`Found known advertiser ID for ${normalizedQuery}: ${knownAdvertiserIds[normalizedQuery]}`);
    return [knownAdvertiserIds[normalizedQuery]];
  }
  
  // Check if query exactly matches an industry
  if (normalizedQuery in industryAdvertisers) {
    // For industries, return advertisers with IDs when available
    return industryAdvertisers[normalizedQuery].map(brand => 
      knownAdvertiserIds[brand] || brand
    );
  }
  
  // Check if query contains any industry keywords
  for (const [industry, brands] of Object.entries(industryAdvertisers)) {
    if (normalizedQuery.includes(industry)) {
      // Return known brands from this industry with IDs when available
      return brands.map(brand => knownAdvertiserIds[brand] || brand);
    }
  }
  
  // If it's likely a brand name, just return it
  if (!normalizedQuery.includes(' ') && normalizedQuery.length > 2) {
    // If we have the ID, use it
    const knownBrands = Object.keys(knownAdvertiserIds);
    for (const brand of knownBrands) {
      if (brand.includes(normalizedQuery) || normalizedQuery.includes(brand)) {
        console.log(`Found partial match for "${normalizedQuery}" with brand "${brand}"`);
        return [knownAdvertiserIds[brand]];
      }
    }
    return [query]; // Assume it's a brand name
  }
  
  // Default: return a few popular advertisers with known IDs
  return [
    knownAdvertiserIds['nike'] || 'nike',
    knownAdvertiserIds['apple'] || 'apple', 
    knownAdvertiserIds['coca-cola'] || 'coca-cola',
    knownAdvertiserIds['amazon'] || 'amazon', 
    knownAdvertiserIds['starbucks'] || 'starbucks'
  ];
}



/**
 * Search for ads in Google's Ads Transparency Center
 * Using direct API endpoint requests
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
      // For brand searches: First check if we have an ID for this brand
      const normalizedBrand = query.trim().toLowerCase();
      const knownAdvertiserIds: Record<string, string> = {
        'nike': 'AR488803513102942208',
        'adidas': 'AR09364018780667904',
        'apple': 'AR467122456588591104',
        'microsoft': 'AR516879332667596800',
        'google': 'AR18054737239162880',
        'amazon': 'AR579308875399675904',
        'samsung': 'AR525636455835475968',
        'coca-cola': 'AR411337481615515648',
        'pepsi': 'AR547005209329508352',
        'mcdonalds': 'AR586780018707562496',
        'starbucks': 'AR01985402131456000'
      };
      
      // If it's a known brand, use the ID
      if (normalizedBrand in knownAdvertiserIds) {
        advertisers = [knownAdvertiserIds[normalizedBrand]];
        console.log(`Using known advertiser ID for brand ${normalizedBrand}: ${knownAdvertiserIds[normalizedBrand]}`);
      } else {
        // Otherwise use the brand name directly
        advertisers = [query];
      }
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
        // Fetch ads for this advertiser using direct API requests
        const googleAds = await scrapeGoogleAdsForAdvertiser(advertiser, {
          searchType: advertiser.startsWith('AR') ? 'brand' : options.queryType,
          region: options.region,
          maxAds: options.maxAds || 10
        });
        
        // Für Testzwecke: Anstatt in der Datenbank zu speichern, direkt transformieren 
        // und die Objekte ohne Datenbank-Speicherung zurückgeben
        const transformedAds = transformGoogleAds(
          googleAds, 
          options.userId,
          options.queryType === 'industry' ? query : undefined
        );
        
        // Transformierte Ads in Ergebnisliste aufnehmen
        // Wir konvertieren die InsertCompetitorAd zu CompetitorAd, indem wir id und timestamps hinzufügen
        const fakeDbAds = transformedAds.map((ad, index) => ({
          ...ad,
          id: index + 1000, // Fake IDs für Test
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        allAds.push(...fakeDbAds);
        
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