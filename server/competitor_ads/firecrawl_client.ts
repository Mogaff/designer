/**
 * FireCrawl API Client
 * Handles interactions with the FireCrawl API for competitor ad search
 */

import axios from 'axios';
import { CompetitorAd } from '@shared/schema';

// FireCrawl API configuration
const FIRECRAWL_API_URL = 'https://api.firecrawl.com/v1';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

// Check if the API key is configured
export function isConfigured(): boolean {
  return !!FIRECRAWL_API_KEY;
}

/**
 * Search for competitor ads using FireCrawl API
 */
export async function searchFireCrawlAds(query: string, options: {
  queryType: 'brand' | 'keyword' | 'industry';
  userId: number;
  region?: string;
  limit?: number;
  platforms?: string[];
}): Promise<Partial<CompetitorAd>[]> {
  try {
    if (!FIRECRAWL_API_KEY) {
      throw new Error('FireCrawl API key is not configured');
    }

    // Prepare the request parameters
    const params = {
      query,
      type: options.queryType,
      region: options.region || 'US',
      limit: options.limit || 20,
      platforms: options.platforms?.join(',') || undefined
    };
    
    // Make the API request
    const response = await axios.get(`${FIRECRAWL_API_URL}/search/ads`, {
      params,
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 200) {
      throw new Error(`FireCrawl API returned status ${response.status}`);
    }

    // Convert FireCrawl API results to our CompetitorAd format
    const ads = mapFireCrawlResponseToCompetitorAds(response.data.ads);
    
    return ads;
  } catch (error) {
    console.error('Error searching FireCrawl API:', error);
    throw new Error(`FireCrawl API search failed: ${(error as Error).message}`);
  }
}

/**
 * Map FireCrawl API response to our CompetitorAd format
 */
function mapFireCrawlResponseToCompetitorAds(firecrawlAds: any[]): Partial<CompetitorAd>[] {
  return firecrawlAds.map(ad => {
    return {
      // Core fields that map to our DB
      platform: ad.platform || 'web',
      brand: ad.advertiser || ad.brand || 'Unknown',
      headline: ad.headline || ad.title || null,
      body: ad.description || ad.body || null,
      image_url: ad.imageUrl || ad.image_url || null, 
      thumbnail_url: ad.thumbnailUrl || ad.thumbnail_url || null,
      cta: ad.callToAction || ad.cta || null,
      
      // Additional fields
      start_date: null,
      platform_details: ad.platform_details || null,
      style_description: ad.style || null,
      ad_id: ad.adId || ad.ad_id || String(ad.id) || null,
      page_id: ad.pageId || ad.page_id || null,
      snapshot_url: ad.snapshotUrl || ad.snapshot_url || null,
      industry: ad.industry || null,
      tags: ad.tags ? (Array.isArray(ad.tags) ? ad.tags : [ad.tags]) : [],
      is_active: true,
      
      // We'll fill these in later
      fetched_by_user_id: null,
      
      // For any additional data
      metadata: {
        originalId: ad.id,
        source: 'firecrawl',
        rawData: ad
      }
    };
  });
}

/**
 * Validate FireCrawl API key
 */
export async function validateFireCrawlApiKey(): Promise<boolean> {
  try {
    if (!FIRECRAWL_API_KEY) {
      return false;
    }

    const response = await axios.get(`${FIRECRAWL_API_URL}/auth/status`, {
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
      }
    });

    return response.status === 200;
  } catch (error) {
    console.error('Error validating FireCrawl API key:', error);
    return false;
  }
}