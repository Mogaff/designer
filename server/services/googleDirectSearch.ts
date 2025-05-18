/**
 * Direct Google Custom Search API Implementation
 * Uses API Key instead of OAuth for simpler access
 */

import axios from 'axios';
import { CompetitorAd, InsertCompetitorAd } from '@shared/schema';
import { db } from '../db';
import { competitorAds } from '@shared/schema';
import { sql } from 'drizzle-orm';

// Google Custom Search API endpoint
const GOOGLE_SEARCH_API_URL = 'https://www.googleapis.com/customsearch/v1';

// Environment variables
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

/**
 * Check if Google API Key and Custom Search are configured
 */
export async function checkGoogleApiConfiguration(): Promise<boolean> {
  const hasApiKey = !!GOOGLE_API_KEY;
  const hasCseId = !!GOOGLE_CSE_ID;
  
  return hasApiKey && hasCseId;
}

/**
 * Perform a direct search using Google Custom Search API
 */
export async function searchGoogleDirectly(query: string, options: {
  maxResults?: number;
  region?: string;
} = {}): Promise<any[]> {
  try {
    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      throw new Error('Google API Key or Custom Search Engine ID is not configured');
    }
    
    // Set default options
    const maxResults = options.maxResults || 10;
    const region = options.region || 'US'; // Beachte: Ländercode sollte großgeschrieben sein
    
    // Construct the query - nur die absolut notwendigen Parameter verwenden
    const params: Record<string, any> = {
      key: GOOGLE_API_KEY,
      cx: GOOGLE_CSE_ID,
      q: query,
      num: maxResults > 10 ? 10 : maxResults, // Google erlaubt max. 10 Ergebnisse pro Anfrage
    };
    
    // Optionale Parameter nur hinzufügen, wenn sie benötigt werden
    if (region && region.length === 2) {
      params.gl = region.toUpperCase(); // Geographic location (Ländercode)
    }
    
    console.log(`Performing direct Google search for: "${query}"`);
    
    // Make the API request
    const response = await axios.get(GOOGLE_SEARCH_API_URL, { params });
    
    if (!response.data || !response.data.items) {
      return [];
    }
    
    console.log(`Found ${response.data.items.length} search results for "${query}"`);
    
    return response.data.items;
  } catch (error: unknown) {
    console.error('Error searching Google directly:', error);
    // Sicheren Zugriff auf Axios-Fehlerdetails implementieren
    if (typeof error === 'object' && error !== null) {
      const axiosError = error as any;
      if (axiosError.response?.data?.error) {
        console.error('Google API error details:', axiosError.response.data.error);
      }
    }
    return [];
  }
}

/**
 * Transform Google search results into CompetitorAd format
 */
export function transformGoogleResults(results: any[], brand: string, userId?: number): InsertCompetitorAd[] {
  return results.map(item => {
    // Create a CompetitorAd from search result
    const competitorAd: InsertCompetitorAd = {
      platform: 'Google',
      brand: brand,
      headline: item.title || null,
      body: item.snippet || null,
      image_url: item.pagemap?.cse_image?.[0]?.src || item.pagemap?.cse_thumbnail?.[0]?.src || null,
      thumbnail_url: item.pagemap?.cse_thumbnail?.[0]?.src || null,
      cta: null,
      start_date: null,
      platform_details: JSON.stringify({
        displayLink: item.displayLink,
        formattedUrl: item.formattedUrl
      }),
      style_description: null,
      ad_id: item.cacheId || item.link || '',
      page_id: item.displayLink || '',
      snapshot_url: item.link || '',
      fetched_by_user_id: userId || null,
      industry: null,
      tags: [],
      is_active: true,
      metadata: JSON.stringify({
        lastSeen: new Date().toISOString(),
        source: 'google_direct_search',
        searchMethod: 'api_key'
      })
    };
    
    return competitorAd;
  });
}

/**
 * Save Google search results as competitor ads
 */
export async function saveGoogleResults(ads: InsertCompetitorAd[]): Promise<CompetitorAd[]> {
  try {
    if (ads.length === 0) {
      return [];
    }
    
    // Insert ads into the database
    const savedAds = await db.insert(competitorAds)
      .values(ads)
      .returning();
    
    console.log(`Saved ${savedAds.length} Google search results as competitor ads`);
    
    return savedAds;
  } catch (error) {
    console.error('Error saving Google search results:', error);
    return [];
  }
}

/**
 * Search for competitor ads using Google Custom Search API directly
 */
export async function findCompetitorAdsViaGoogle(query: string, options: {
  userId?: number;
  maxResults?: number;
  region?: string;
}): Promise<CompetitorAd[]> {
  try {
    // Search Google directly
    const searchResults = await searchGoogleDirectly(query, {
      maxResults: options.maxResults,
      region: options.region
    });
    
    if (searchResults.length === 0) {
      return [];
    }
    
    // Transform search results into competitor ads
    const transformedAds = transformGoogleResults(
      searchResults, 
      query, 
      options.userId
    );
    
    // Save ads to database
    const savedAds = await saveGoogleResults(transformedAds);
    
    return savedAds;
  } catch (error) {
    console.error('Error finding competitor ads via Google:', error);
    return [];
  }
}