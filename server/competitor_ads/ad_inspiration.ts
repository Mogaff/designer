/**
 * Ad Inspiration Service
 * Handles fetching competitor ads from multiple sources and providing inspiration for AI-generated ads
 */

import { searchMetaAds, checkMetaApiKey } from './meta_ad_library';
import { searchGoogleAds, checkGoogleApiKeys } from './google_ads_transparency';
import { CompetitorAd, InsertAdSearchQuery, AdSearchQuery, adSearchQueries, competitorAds } from '@shared/schema';
import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client for style analysis
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface SearchOptions {
  userId: number;
  platforms?: string[];
  limit?: number;
  region?: string;
}

/**
 * Main function to search for competitor ads across platforms
 */
export async function searchCompetitorAds(
  query: string,
  queryType: 'brand' | 'keyword' | 'industry',
  options: SearchOptions
): Promise<{
  ads: CompetitorAd[];
  searchId: number;
}> {
  try {
    console.log(`Searching for ${queryType}: "${query}" on platforms: ${options.platforms?.join(', ') || 'all'}`);
    
    // Create a record of this search
    const searchRecord: InsertAdSearchQuery = {
      user_id: options.userId,
      query_type: queryType,
      query_text: query,
      platforms: options.platforms || ['meta', 'google'],
      status: 'in_progress',
    };
    
    // Save the search to the database
    const [savedSearch] = await db.insert(adSearchQueries).values(searchRecord).returning();
    
    const searchId = savedSearch.id;
    let allAds: CompetitorAd[] = [];
    
    try {
      // Check if we should search Meta
      if (!options.platforms || options.platforms.includes('meta')) {
        const hasMetaApiKey = await checkMetaApiKey();
        
        if (hasMetaApiKey) {
          console.log('Searching Meta Ad Library...');
          const metaAds = await searchMetaAds(query, {
            queryType,
            userId: options.userId,
            limit: options.limit,
            country: options.region
          });
          
          allAds = [...allAds, ...metaAds];
          console.log(`Found ${metaAds.length} ads from Meta Ad Library`);
        } else {
          console.warn('Meta API key not configured. Skipping Meta ad search.');
        }
      }
      
      // Check if we should search Google
      if (!options.platforms || options.platforms.includes('google')) {
        // First try the direct API method
        try {
          // Import the direct search functionality
          const { 
            checkGoogleApiConfiguration, 
            findCompetitorAdsViaGoogle 
          } = await import('../services/googleDirectSearch');
          
          // Check if direct API is configured
          const isDirectApiConfigured = await checkGoogleApiConfiguration();
          
          if (isDirectApiConfigured) {
            console.log('Searching Google Ads using direct API key...');
            
            // Search using the direct API method
            const googleAds = await findCompetitorAdsViaGoogle(query, {
              userId: options.userId,
              maxResults: options.limit,
              region: options.region
            });
            
            allAds = [...allAds, ...googleAds];
            console.log(`Found ${googleAds.length} ads from Google Search API (direct)`);
          } else {
            // Fall back to OAuth method if direct API is not configured
            console.log('Direct API not configured, falling back to OAuth method...');
            
            // Check if Google OAuth and CSE ID are configured before attempting search
            const isGoogleConfigured = await checkGoogleApiKeys();
            
            if (isGoogleConfigured) {
              const googleAds = await searchGoogleAds(query, {
                queryType,
                userId: options.userId,
                maxAds: options.limit,
                region: options.region
              });
              
              allAds = [...allAds, ...googleAds];
              console.log(`Found ${googleAds.length} ads from Google Search API (OAuth)`);
            } else {
              console.warn('Google Search API is not fully configured. Authentication and/or Custom Search Engine ID may be missing.');
            }
          }
        } catch (error) {
          console.error('Error searching Google Ads:', error);
          console.warn('Google Search API encountered an error. Using alternative sources only.');
        }
      }
      
      // Update the search record with the results
      await db.update(adSearchQueries)
        .set({
          status: 'completed',
          results_count: allAds.length
        })
        .where(eq(adSearchQueries.id, searchId));
      
      // Return the ads
      return {
        ads: allAds,
        searchId
      };
      
    } catch (error) {
      // Update the search record with the error
      await db.update(adSearchQueries)
        .set({
          status: 'failed',
          error_message: (error as Error).message
        })
        .where(eq(adSearchQueries.id, searchId));
      
      throw error;
    }
    
  } catch (error) {
    console.error(`Error searching for competitor ads: ${query}`, error);
    throw new Error(`Failed to search for competitor ads: ${(error as Error).message}`);
  }
}

/**
 * Get previous ad search queries for a user
 */
export async function getRecentSearches(userId: number, limit: number = 10): Promise<AdSearchQuery[]> {
  try {
    const searches = await db.select()
      .from(adSearchQueries)
      .where(eq(adSearchQueries.user_id, userId))
      .orderBy(desc(adSearchQueries.created_at))
      .limit(limit);
    
    return searches;
  } catch (error) {
    console.error('Error fetching recent searches:', error);
    throw new Error(`Failed to fetch recent searches: ${(error as Error).message}`);
  }
}

/**
 * Get ads for a specific search
 */
export async function getAdsForSearch(searchId: number): Promise<CompetitorAd[]> {
  try {
    // Find the search record
    const [search] = await db.select()
      .from(adSearchQueries)
      .where(eq(adSearchQueries.id, searchId))
      .limit(1);
    
    if (!search) {
      throw new Error(`Search with ID ${searchId} not found`);
    }
    
    // Get ads that were fetched by this user and match the search query
    const ads = await db.select()
      .from(competitorAds)
      .where(
        and(
          eq(competitorAds.fetched_by_user_id, search.user_id),
          // If it's a brand search, look for that specific brand
          search.query_type === 'brand' 
            ? eq(competitorAds.brand, search.query_text)
            // If it's a keyword/industry search, use the industry field
            : eq(competitorAds.industry, search.query_text)
        )
      )
      .orderBy(desc(competitorAds.created_at));
    
    return ads;
  } catch (error) {
    console.error(`Error fetching ads for search ${searchId}:`, error);
    throw new Error(`Failed to fetch ads for search: ${(error as Error).message}`);
  }
}

/**
 * Generate style description for an ad using AI
 */
export async function generateStyleDescription(ad: CompetitorAd): Promise<string> {
  try {
    if (!ad.image_url) {
      return "No image available for style analysis";
    }
    
    const systemPrompt = `You are a professional advertising designer with extensive experience analyzing visual design elements in marketing materials. Your job is to provide a concise, detailed description of the visual style of advertisements.`;
    
    const userPrompt = `Analyze this ${ad.platform} advertisement from ${ad.brand} and describe its visual style in a concise paragraph (max 100 words).
    
    Focus on:
    - Color scheme and palette
    - Typography and font choices
    - Visual composition and layout
    - Use of whitespace
    - Image treatment (filters, effects, etc.)
    - Overall aesthetic (minimalist, bold, luxurious, etc.)
    
    Ad details:
    Headline: ${ad.headline || 'N/A'}
    Body text: ${ad.body || 'N/A'}
    CTA: ${ad.cta || 'N/A'}
    Image URL: ${ad.image_url}
    
    Provide only the style description, no introduction or conclusion.`;
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 300,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt }
      ]
    });
    
    // Handle different content formats
    let styleDescription = "";
    if (response.content && response.content.length > 0) {
      const content = response.content[0];
      if (content.type === 'text') {
        styleDescription = content.text.trim();
      } else {
        // If not text type, convert to string somehow
        styleDescription = "Style analysis completed, but response format not as expected.";
      }
    }
    
    // Update the ad in the database with the style description
    await db.update(competitorAds)
      .set({ style_description: styleDescription })
      .where(eq(competitorAds.id, ad.id));
    
    return styleDescription;
  } catch (error) {
    console.error('Error generating style description:', error);
    return "Style analysis failed: " + (error as Error).message;
  }
}

/**
 * Get ads from the database only (without making external API calls)
 * Used as a fallback when API access fails
 */
export async function getAdsFromDatabase(options: {
  industry?: string;
  brand?: string;
  keyword?: string;
  userId: number;
  limit?: number;
}): Promise<CompetitorAd[]> {
  try {
    let whereClause: any;
    
    // Determine the where clause based on the query type
    if (options.brand) {
      whereClause = and(
        eq(competitorAds.fetched_by_user_id, options.userId),
        eq(competitorAds.brand, options.brand)
      );
    } else if (options.industry) {
      whereClause = and(
        eq(competitorAds.fetched_by_user_id, options.userId),
        eq(competitorAds.industry, options.industry)
      );
    } else if (options.keyword) {
      // For keyword searches, try to match in headline, body, or industry fields
      // This is simplified and could be improved with a full-text search
      whereClause = and(
        eq(competitorAds.fetched_by_user_id, options.userId)
      );
      // Note: This doesn't actually filter by keyword, just returns user's ads
      // A proper implementation would use a text search column or LIKE operator
    } else {
      throw new Error('Must provide either brand, industry, or keyword parameter');
    }
    
    // Get ads from the database
    const ads = await db.select()
      .from(competitorAds)
      .where(whereClause)
      .orderBy(desc(competitorAds.created_at))
      .limit(options.limit || 20);
    
    return ads;
  } catch (error) {
    console.error('Error getting ads from database:', error);
    throw new Error(`Failed to get ads from database: ${(error as Error).message}`);
  }
}

export async function getAdInspiration(options: {
  industry?: string;
  brand?: string;
  keyword?: string;
  userId: number;
  limit?: number;
}): Promise<CompetitorAd[]> {
  try {
    let query;
    let queryType: 'brand' | 'keyword' | 'industry';
    
    // Determine query type and text
    if (options.brand) {
      query = options.brand;
      queryType = 'brand';
    } else if (options.industry) {
      query = options.industry;
      queryType = 'industry';
    } else if (options.keyword) {
      query = options.keyword;
      queryType = 'keyword';
    } else {
      throw new Error('Must provide either brand, industry, or keyword parameter');
    }
    
    try {
      // First try to search for competitor ads using APIs
      const result = await searchCompetitorAds(query, queryType, {
        userId: options.userId,
        limit: options.limit || 20
      });
      
      // Return the ads if successful
      return result.ads;
    } catch (error) {
      // If API search fails, fall back to database-only search
      const apiError = error as Error;
      console.warn(`API search failed, falling back to database: ${apiError.message}`);
      
      // Get ads from the database as a fallback
      return await getAdsFromDatabase(options);
    }
  } catch (error) {
    console.error('Error getting ad inspiration:', error);
    throw new Error(`Failed to get ad inspiration: ${(error as Error).message}`);
  }
}