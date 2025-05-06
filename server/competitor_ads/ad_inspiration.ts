/**
 * Ad Inspiration Service
 * Handles fetching competitor ads from multiple sources and providing inspiration for AI-generated ads
 */

import { searchMetaAds, checkMetaApiKey } from './meta_ad_library';
import { searchGoogleAds } from './google_ads_transparency';
import { searchFireCrawlAds, isConfigured as isFireCrawlConfigured, validateFireCrawlApiKey } from './firecrawl_client';
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
      // Check if FireCrawl is configured - this is now our preferred search method
      if (isFireCrawlConfigured()) {
        console.log('Searching FireCrawl API...');
        try {
          const fireCrawlAds = await searchFireCrawlAds(query, {
            queryType,
            userId: options.userId,
            limit: options.limit || 20,
            region: options.region || 'US',
            platforms: options.platforms
          });
          
          // Store the ads in the database for future reference
          for (const ad of fireCrawlAds) {
            try {
              // Check if we already have this ad in the database
              const conditions = [eq(competitorAds.brand, ad.brand || 'Unknown')];
              
              if (ad.headline) {
                conditions.push(eq(competitorAds.headline, ad.headline));
              }
              
              const existingAds = await db.select()
                .from(competitorAds)
                .where(and(...conditions))
                .limit(1);
                
              if (existingAds.length === 0) {
                // Insert the ad into the database with the user id who fetched it
                // Make sure all required fields are present with defaults for optional ones
                await db.insert(competitorAds).values({
                  brand: ad.brand || 'Unknown',
                  platform: ad.platform || 'web',
                  headline: ad.headline || null,
                  body: ad.body || null,
                  image_url: ad.image_url || null,
                  thumbnail_url: ad.thumbnail_url || null,
                  cta: ad.cta || null,
                  start_date: ad.start_date || null,
                  platform_details: ad.platform_details || null,
                  style_description: ad.style_description || null,
                  ad_id: ad.ad_id || null,
                  page_id: ad.page_id || null,
                  snapshot_url: ad.snapshot_url || null, 
                  industry: ad.industry || null,
                  tags: ad.tags || [],
                  is_active: true,
                  fetched_by_user_id: options.userId,
                  metadata: ad.metadata || {}
                });
              }
            } catch (dbError) {
              console.error('Error saving ad to database:', dbError);
              // Continue with the next ad
            }
          }
          
          // Convert Partial<CompetitorAd>[] to CompetitorAd[]
          const completedAds = fireCrawlAds.map(ad => {
            return {
              id: ad.id || 0,
              brand: ad.brand || 'Unknown',
              platform: ad.platform || 'web',
              headline: ad.headline || null,
              body: ad.body || null,
              image_url: ad.image_url || null,
              thumbnail_url: ad.thumbnail_url || null,
              cta: ad.cta || null,
              start_date: ad.start_date || null,
              platform_details: ad.platform_details || null,
              style_description: ad.style_description || null,
              ad_id: ad.ad_id || null,
              page_id: ad.page_id || null,
              snapshot_url: ad.snapshot_url || null, 
              industry: ad.industry || null,
              tags: ad.tags || [],
              is_active: true,
              fetched_by_user_id: options.userId,
              created_at: new Date(),
              metadata: ad.metadata || {}
            } as CompetitorAd;
          });
          
          allAds = [...allAds, ...completedAds];
          console.log(`Found ${fireCrawlAds.length} ads from FireCrawl API`);
          
          // If we got results from FireCrawl, we can skip the other sources
          if (fireCrawlAds.length > 0) {
            console.log('Using FireCrawl results exclusively as search was successful');
            // Skip Meta and Google searches
            return {
              ads: allAds,
              searchId
            };
          }
        } catch (error) {
          console.error('Error searching FireCrawl API:', error);
          console.error('Will try fallback search methods');
          // Continue to fallback search methods
        }
      } else {
        console.warn('FireCrawl API key not configured. Please set FIRECRAWL_API_KEY environment variable.');
        console.log('Using fallback search methods instead...');
      }
      
      // FALLBACK METHODS
      // Only use these if FireCrawl didn't return results or isn't configured
      
      // Check if we should search Meta
      if (!options.platforms || options.platforms.includes('meta')) {
        const hasMetaApiKey = await checkMetaApiKey();
        
        if (hasMetaApiKey) {
          console.log('Searching Meta Ad Library...');
          try {
            const metaAds = await searchMetaAds(query, {
              queryType,
              userId: options.userId,
              limit: options.limit,
              country: options.region
            });
            
            allAds = [...allAds, ...metaAds];
            console.log(`Found ${metaAds.length} ads from Meta Ad Library`);
          } catch (error) {
            console.error('Error searching Meta Ad Library:', error);
            console.error('Please check the META_API_KEY environment variable');
          }
        } else {
          console.warn('Meta API key not configured or invalid. Please set a valid META_API_KEY environment variable.');
        }
      }
      
      // Check if we should search Google as a last resort
      if (allAds.length === 0 && (!options.platforms || options.platforms.includes('google'))) {
        console.log('Searching Google Ads Transparency Center...');
        try {
          // Search for relevant advertisers
          const searchTerm = queryType === 'brand' ? query : 
                            (queryType === 'industry' ? query + ' companies' : query);
          console.log(`Searching Google Ads for ${Math.min(3, options.limit || 3)} advertisers related to: ${searchTerm}`);
          
          // For simplicity, we'll just use the search term directly as the advertiser name
          // This should work well for brand searches
          try {
            const googleAds = await searchGoogleAds(searchTerm, {
              queryType,
              userId: options.userId,
              maxAds: Math.min(5, options.limit || 5),
              region: options.region || 'US'
            });
            
            allAds = [...allAds, ...googleAds];
            console.log(`Found ${googleAds.length} ads from Google Ads Transparency Center`);
          } catch (error) {
            console.error('Error searching Google Ads Transparency Center:', error);
            // Continue execution - we don't want to fail the entire search if Google fails
          }
        } catch (error) {
          console.error('Failed to search Google Ads:', error);
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
 * Get competitor ads for inspiration based on provided options
 */
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
    
    // Search for competitor ads
    const result = await searchCompetitorAds(query, queryType, {
      userId: options.userId,
      limit: options.limit || 20
    });
    
    // Return the ads
    return result.ads;
  } catch (error) {
    console.error('Error getting ad inspiration:', error);
    throw new Error(`Failed to get ad inspiration: ${(error as Error).message}`);
  }
}