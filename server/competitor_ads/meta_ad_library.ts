/**
 * Meta Ad Library API Client
 * Handles fetching competitor ads from Meta's Ad Library API
 */

import axios from 'axios';
import { CompetitorAd, InsertCompetitorAd } from '@shared/schema';
import { db } from '../db';
import { competitorAds } from '@shared/schema';

// Meta Graph API base URL
const META_API_BASE_URL = 'https://graph.facebook.com/v19.0';

interface MetaAdLibraryOptions {
  searchTerms?: string;
  searchPageIds?: string[];
  adActiveStatus?: 'ACTIVE' | 'INACTIVE' | 'ALL';
  adReachedCountries?: string[];
  adDeliveryDateMin?: string;
  adDeliveryDateMax?: string;
  limit?: number;
}

interface MetaAdData {
  page_id: string;
  page_name: string;
  ad_snapshot_url: string;
  ad_creative_body_text?: string;
  ad_creative_link_title?: string;
  ad_creative_link_description?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  placements?: string[];
  id?: string;
  ad_format?: string;
  call_to_action?: string;
  images?: { url: string }[];
}

/**
 * Fetch ads from Meta's Ad Library API
 */
export async function fetchMetaAds(options: MetaAdLibraryOptions): Promise<MetaAdData[]> {
  if (!process.env.META_API_KEY) {
    throw new Error('META_API_KEY environment variable not set. Please add your Meta API key to access the Ad Library API.');
  }

  try {
    // Construct endpoint URL with parameters
    let url = `${META_API_BASE_URL}/ads_archive`;
    
    // Prepare parameters
    const params: Record<string, any> = {
      access_token: process.env.META_API_KEY,
      ad_active_status: options.adActiveStatus || 'ACTIVE',
      limit: options.limit || 50,
      fields: [
        'page_id',
        'page_name',
        'ad_snapshot_url',
        'ad_creative_body_text',
        'ad_creative_link_title',
        'ad_creative_link_description',
        'ad_delivery_start_time',
        'ad_delivery_stop_time',
        'placements',
        'id',
        'ad_format',
        'call_to_action',
        'images'
      ].join(',')
    };

    // Add optional parameters if provided
    if (options.searchTerms) {
      params.search_terms = options.searchTerms;
    }
    
    if (options.searchPageIds && options.searchPageIds.length > 0) {
      params.search_page_ids = options.searchPageIds.join(',');
    }
    
    if (options.adReachedCountries && options.adReachedCountries.length > 0) {
      params.ad_reached_countries = options.adReachedCountries.join(',');
    }
    
    if (options.adDeliveryDateMin) {
      params.ad_delivery_date_min = options.adDeliveryDateMin;
    }
    
    if (options.adDeliveryDateMax) {
      params.ad_delivery_date_max = options.adDeliveryDateMax;
    }
    
    console.log('Fetching ads from Meta Ad Library with params:', JSON.stringify(params, null, 2));
    
    // Make API request
    const response = await axios.get(url, { params });
    
    if (!response.data || !response.data.data) {
      console.warn('No ad data returned from Meta API');
      return [];
    }
    
    console.log(`Successfully fetched ${response.data.data.length} ads from Meta Ad Library`);
    return response.data.data as MetaAdData[];

  } catch (error) {
    const err = error as any;
    
    // Handle various API errors
    if (err.response) {
      const status = err.response.status;
      const errorData = err.response.data?.error || {};
      
      // Authentication errors
      if (status === 401 || errorData.code === 190) {
        throw new Error(`Meta API authentication error: ${errorData.message || 'Invalid API key'}. Please check your META_API_KEY.`);
      }
      
      // Rate limiting
      if (status === 429 || errorData.code === 4) {
        throw new Error(`Meta API rate limit reached: ${errorData.message}`);
      }
      
      // Permission errors
      if (status === 403 || errorData.code === 200) {
        throw new Error(`Meta API permission error: ${errorData.message}. Your app may need additional permissions to access the Ad Library API.`);
      }
      
      throw new Error(`Meta API error (${status}): ${errorData.message || JSON.stringify(errorData)}`);
    }
    
    throw new Error(`Failed to fetch ads from Meta Ad Library: ${err.message}`);
  }
}

/**
 * Transform Meta ad data into our standard Competitor Ad format
 */
export function transformMetaAds(metaAds: MetaAdData[], userId?: number, industry?: string): InsertCompetitorAd[] {
  return metaAds.map(ad => {
    // Extract the image URL if available
    const imageUrl = ad.images && ad.images.length > 0 ? ad.images[0].url : undefined;
    
    // Parse dates correctly
    let startDate: Date | undefined;
    if (ad.ad_delivery_start_time) {
      startDate = new Date(ad.ad_delivery_start_time);
    }
    
    // Create the transformed competitor ad
    const competitorAd: InsertCompetitorAd = {
      platform: 'Meta',
      brand: ad.page_name,
      headline: ad.ad_creative_link_title || null,
      body: ad.ad_creative_body_text || null,
      image_url: imageUrl || null,
      thumbnail_url: imageUrl || null, // Use same image for thumbnail
      cta: ad.call_to_action || null,
      start_date: startDate ? startDate.toISOString().split('T')[0] : null, // Convert Date to string format YYYY-MM-DD
      platform_details: ad.placements ? ad.placements.join(', ') : null,
      ad_id: ad.id || null,
      page_id: ad.page_id || null,
      snapshot_url: ad.ad_snapshot_url || null,
      fetched_by_user_id: userId || null,
      industry: industry || null,
      tags: [], // No tags by default
      is_active: true,
      style_description: null, // We'll generate this separately using AI
      metadata: {
        ad_format: ad.ad_format,
        ad_creative_link_description: ad.ad_creative_link_description,
        ad_delivery_stop_time: ad.ad_delivery_stop_time,
        raw_meta_data: ad // Store the original data for reference
      }
    };
    
    return competitorAd;
  });
}

/**
 * Save fetched Meta ads to the database
 */
export async function saveMetaAds(metaAds: MetaAdData[], userId?: number, industry?: string): Promise<CompetitorAd[]> {
  const transformedAds = transformMetaAds(metaAds, userId, industry);
  
  if (transformedAds.length === 0) {
    return [];
  }
  
  try {
    console.log(`Saving ${transformedAds.length} Meta ads to database`);
    
    // Insert all ads and return the inserted records
    const savedAds = await db.insert(competitorAds).values(transformedAds).returning();
    
    console.log(`Successfully saved ${savedAds.length} Meta ads to database`);
    return savedAds;
  } catch (error) {
    console.error('Error saving Meta ads to database:', error);
    throw new Error(`Failed to save Meta ads to database: ${(error as Error).message}`);
  }
}

/**
 * Search and fetch ads from Meta Ad Library
 */
export async function searchMetaAds(query: string, options: {
  queryType?: 'brand' | 'keyword' | 'industry';
  userId?: number;
  limit?: number;
  country?: string;
}): Promise<CompetitorAd[]> {
  try {
    // Default to UK for EU coverage (as mentioned in the spec)
    const country = options.country || 'GB';
    
    const metaOptions: MetaAdLibraryOptions = {
      adReachedCountries: [country],
      limit: options.limit || 50,
      adActiveStatus: 'ACTIVE',
    };
    
    // Adjust parameters based on query type
    if (options.queryType === 'brand') {
      // For brand searches, use searchTerms which searches both Page name and ad content
      metaOptions.searchTerms = query;
    } else {
      // For keyword/industry searches, use searchTerms (general search)
      metaOptions.searchTerms = query;
    }
    
    // Call the Meta Ad Library API
    const metaAds = await fetchMetaAds(metaOptions);
    
    if (metaAds.length === 0) {
      console.log(`No ads found on Meta for query: ${query}`);
      return [];
    }
    
    // Save the ads to our database
    const savedAds = await saveMetaAds(
      metaAds, 
      options.userId,
      options.queryType === 'industry' ? query : undefined
    );
    
    return savedAds;
  } catch (error) {
    console.error(`Error searching Meta ads for "${query}":`, error);
    throw error;
  }
}

/**
 * Check if the Meta API Key is valid and working
 */
export async function checkMetaApiKey(): Promise<boolean> {
  if (!process.env.META_API_KEY) {
    console.log('META_API_KEY environment variable not set');
    return false;
  }
  
  try {
    // Try a simple request to the Meta API
    const url = `${META_API_BASE_URL}/ads_archive`;
    const params = {
      access_token: process.env.META_API_KEY,
      ad_active_status: 'ACTIVE',
      ad_reached_countries: 'GB',
      search_terms: 'test',
      limit: 1,
      fields: 'page_name'
    };
    
    await axios.get(url, { params });
    
    // If we get here, the API key is valid
    return true;
  } catch (error) {
    console.error('Error validating Meta API key:', error);
    return false;
  }
}

/**
 * NOT USED - Removed placeholder ad generation as per user requirements
 * We only want to use authentic data from authorized sources
 */

/**
 * NOT USED - Removed placeholder ad generation as per user requirements
 * We only want to use authentic data from authorized sources
 */