/**
 * Competitor Ad API Routes
 * Handles routes for searching competitor ads and using them as inspiration
 */

import { Request, Response } from 'express';
import { isAuthenticated } from '../auth';
import { 
  searchCompetitorAds, 
  getRecentSearches, 
  getAdsForSearch,
  generateStyleDescription,
  getAdInspiration
} from './ad_inspiration';
import { db } from '../db';
import { competitorAds } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Register competitor ad inspiration API routes
 */
export function registerCompetitorAdRoutes(app: any) {
  // Search for competitor ads
  app.post('/api/ad-inspiration/search', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { query, queryType, platforms, limit, region } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }
      
      if (!queryType || !['brand', 'keyword', 'industry'].includes(queryType)) {
        return res.status(400).json({ error: 'Valid queryType is required: brand, keyword, or industry' });
      }
      
      // Get the user ID from the authenticated session
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User must be authenticated' });
      }
      
      // Start the search
      const result = await searchCompetitorAds(
        query,
        queryType as 'brand' | 'keyword' | 'industry',
        {
          userId,
          platforms: platforms,
          limit: limit || 20,
          region: region || 'US'
        }
      );
      
      return res.status(200).json({
        message: `Found ${result.ads.length} ads for ${queryType}: "${query}"`,
        searchId: result.searchId,
        count: result.ads.length,
        ads: result.ads.slice(0, 10), // Return only first 10 to keep response size small
      });
      
    } catch (error) {
      console.error('Error in ad inspiration search:', error);
      return res.status(500).json({ error: `Search failed: ${(error as Error).message}` });
    }
  });
  
  // Get recent ad searches for the authenticated user
  app.get('/api/ad-inspiration/recent-searches', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User must be authenticated' });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const searches = await getRecentSearches(userId, limit);
      
      return res.status(200).json({
        searches
      });
      
    } catch (error) {
      console.error('Error fetching recent searches:', error);
      return res.status(500).json({ error: `Failed to fetch recent searches: ${(error as Error).message}` });
    }
  });
  
  // Get ads for a specific search
  app.get('/api/ad-inspiration/search/:searchId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const searchId = parseInt(req.params.searchId);
      
      if (isNaN(searchId)) {
        return res.status(400).json({ error: 'Valid searchId is required' });
      }
      
      const ads = await getAdsForSearch(searchId);
      
      return res.status(200).json({
        count: ads.length,
        ads
      });
      
    } catch (error) {
      console.error(`Error fetching ads for search ${req.params.searchId}:`, error);
      return res.status(500).json({ error: `Failed to fetch ads: ${(error as Error).message}` });
    }
  });
  
  // Get a specific competitor ad by ID
  app.get('/api/ad-inspiration/ad/:adId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const adId = parseInt(req.params.adId);
      
      if (isNaN(adId)) {
        return res.status(400).json({ error: 'Valid adId is required' });
      }
      
      // Get the ad from the database
      const [ad] = await db.select()
        .from(competitorAds)
        .where(eq(competitorAds.id, adId))
        .limit(1);
      
      if (!ad) {
        return res.status(404).json({ error: `Ad with ID ${adId} not found` });
      }
      
      // Generate style description if it doesn't exist
      if (!ad.style_description) {
        ad.style_description = await generateStyleDescription(ad);
      }
      
      return res.status(200).json({
        ad
      });
      
    } catch (error) {
      console.error(`Error fetching ad ${req.params.adId}:`, error);
      return res.status(500).json({ error: `Failed to fetch ad: ${(error as Error).message}` });
    }
  });
  
  // Get ad inspiration for design generation
  app.post('/api/ad-inspiration/inspire', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { industry, brand, keyword, limit } = req.body;
      
      // At least one of industry, brand, or keyword must be provided
      if (!industry && !brand && !keyword) {
        return res.status(400).json({ error: 'Must provide at least one of: industry, brand, or keyword' });
      }
      
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User must be authenticated' });
      }
      
      // Get inspiration
      const ads = await getAdInspiration({
        industry,
        brand,
        keyword,
        userId,
        limit: limit || 5
      });
      
      // Generate style descriptions for any ads that don't have them
      const adsWithStyles = await Promise.all(
        ads.map(async (ad) => {
          if (!ad.style_description) {
            ad.style_description = await generateStyleDescription(ad);
          }
          return ad;
        })
      );
      
      return res.status(200).json({
        count: adsWithStyles.length,
        ads: adsWithStyles,
        // Extract style descriptions for use in AI prompts
        styleInspiration: adsWithStyles
          .filter(ad => ad.style_description)
          .map(ad => `${ad.brand}: ${ad.style_description}`)
          .join('\n\n'),
        // Extract copywriting patterns for use in AI prompts  
        copyInspiration: adsWithStyles
          .filter(ad => ad.headline || ad.body)
          .map(ad => `${ad.brand}: ${ad.headline || ''} - ${ad.body || ''}${ad.cta ? ` (CTA: ${ad.cta})` : ''}`)
          .join('\n\n')
      });
      
    } catch (error) {
      console.error('Error getting ad inspiration:', error);
      return res.status(500).json({ error: `Failed to get ad inspiration: ${(error as Error).message}` });
    }
  });
  
  console.log('Competitor Ad API routes registered');
}

/**
 * Register routes that integrate competitor ads with the existing ad generation process
 */
export function registerAdInspirationIntegrationRoutes(app: any) {
  // Enhance ad generation with competitor inspiration
  app.post('/api/generate-with-inspiration', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { 
        promptText, 
        brand, 
        industry,
        useCompetitorInsights
      } = req.body;
      
      // Check if we should use competitor insights
      if (!useCompetitorInsights) {
        // If not using competitor insights, just return the original request
        return res.status(200).json({
          originalPrompt: promptText,
          enhancedPrompt: promptText,
          competitorInsights: null
        });
      }
      
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User must be authenticated' });
      }
      
      // Get competitor inspiration
      const ads = await getAdInspiration({
        industry,
        brand,
        userId,
        limit: 3
      });
      
      // Generate style descriptions for any ads that don't have them
      const adsWithStyles = await Promise.all(
        ads.map(async (ad) => {
          if (!ad.style_description) {
            ad.style_description = await generateStyleDescription(ad);
          }
          return ad;
        })
      );
      
      // Extract style patterns
      const stylePatterns = adsWithStyles
        .filter(ad => ad.style_description)
        .map(ad => ad.style_description)
        .join('\n');
      
      // Extract copy patterns
      const copyPatterns = adsWithStyles
        .filter(ad => ad.headline || ad.body)
        .map(ad => `${ad.headline || ''} - ${ad.body || ''}${ad.cta ? ` (CTA: ${ad.cta})` : ''}`)
        .join('\n');
      
      // Enhance the original prompt with competitor insights
      const enhancedPrompt = `${promptText}\n\nIncorporate these design patterns from successful competitor ads:\n${stylePatterns}\n\nDraw inspiration from these messaging patterns:\n${copyPatterns}`;
      
      return res.status(200).json({
        originalPrompt: promptText,
        enhancedPrompt,
        competitorInsights: {
          ads: adsWithStyles,
          stylePatterns,
          copyPatterns
        }
      });
      
    } catch (error) {
      console.error('Error enhancing prompt with competitor insights:', error);
      return res.status(500).json({ 
        error: `Failed to enhance prompt: ${(error as Error).message}`,
        originalPrompt: req.body.promptText,
        enhancedPrompt: req.body.promptText // Fall back to original prompt
      });
    }
  });
  
  console.log('Ad Inspiration integration routes registered');
}