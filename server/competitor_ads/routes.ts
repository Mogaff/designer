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
import { eq, sql } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Register competitor ad inspiration API routes
 */
export function registerCompetitorAdRoutes(app: any) {
  // Search for competitor ads - supporting both GET and POST
  const handleAdSearch = async (req: Request, res: Response) => {
    try {
      // Extract parameters from request body (POST) or query params (GET)
      const isGetRequest = req.method === 'GET';
      
      // Get parameters from either query or body depending on request type
      const query = isGetRequest ? req.query.query as string : req.body.query as string;
      const queryType = isGetRequest ? req.query.queryType as string : req.body.queryType as string;
      
      // Parse platforms (could be string or array)
      let platforms: string[] | undefined;
      if (isGetRequest && req.query.platforms) {
        platforms = (req.query.platforms as string).split(',');
      } else if (!isGetRequest && req.body.platforms) {
        platforms = req.body.platforms as string[];
      }
      
      // Parse limit (string or number)
      const limit = isGetRequest 
        ? req.query.limit ? parseInt(req.query.limit as string) : 20
        : req.body.limit || 20;
        
      // Parse region
      const region = isGetRequest ? req.query.region as string : req.body.region as string;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }
      
      if (!queryType || !['brand', 'keyword', 'industry'].includes(queryType)) {
        return res.status(400).json({ error: 'Valid queryType is required: brand, keyword, or industry' });
      }
      
      // Get the user ID from the authenticated session
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User must be authenticated' });
      }
      
      // Before starting a search, check if Google OAuth is configured when platforms includes google
      // We'll make the check inside searchCompetitorAds function
      // The server-side OAuth should work without user-provided API keys
      
      // Start the search
      const result = await searchCompetitorAds(
        query,
        queryType as 'brand' | 'keyword' | 'industry',
        {
          userId,
          platforms,
          limit,
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
  };
  
  // Register both GET and POST routes for searching
  app.post('/api/ad-inspiration/search', isAuthenticated, handleAdSearch);
  app.get('/api/ad-inspiration/search', isAuthenticated, handleAdSearch);
  
  // Get recent ad searches for the authenticated user
  app.get('/api/ad-inspiration/recent-searches', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      
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
      
      const userId = (req.user as any)?.id;
      
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
  
  // Analyze specific ads and generate inspiration
  app.post('/api/ad-inspiration/analyze', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { adIds } = req.body;
      
      if (!adIds || !Array.isArray(adIds) || adIds.length === 0) {
        return res.status(400).json({ error: 'Valid adIds array is required' });
      }
      
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User must be authenticated' });
      }
      
      // Get the ads from the database
      const ads = await db.select()
        .from(competitorAds)
        .where(sql`${competitorAds.id} IN ${adIds}`);
      
      if (ads.length === 0) {
        return res.status(404).json({ error: 'No ads found with the provided IDs' });
      }
      
      // Generate style descriptions for any ads that don't have them
      const adsWithStyles = await Promise.all(
        ads.map(async (ad) => {
          if (!ad.style_description) {
            ad.style_description = await generateStyleDescription(ad);
            
            // Update the ad in the database with the new style description
            await db.update(competitorAds)
              .set({ style_description: ad.style_description })
              .where(eq(competitorAds.id, ad.id));
          }
          return ad;
        })
      );
      
      // Generate insights using Anthropic
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      
      // Create an analysis prompt
      const prompt = `I have ${adsWithStyles.length} competitor ads and want you to analyze them to generate inspiration for creating my own ads.
      
      Here are the details of each ad:
      
      ${adsWithStyles.map((ad, i) => `
      AD #${i+1} - ${ad.brand} (${ad.platform})
      Headline: ${ad.headline || 'N/A'}
      Body: ${ad.body || 'N/A'}
      CTA: ${ad.cta || 'N/A'}
      Style: ${ad.style_description || 'N/A'}
      `).join('\n\n')}
      
      Based on these competitor ads, please:
      
      1. Identify the common themes, messaging patterns, and persuasion techniques used
      2. Extract the most effective stylistic elements and design patterns
      3. Analyze the tone, vocabulary level, and emotional appeals
      4. Provide specific copywriting inspiration based on what works well
      5. Suggest ways to differentiate while incorporating successful elements
      
      Format your response as follows:
      
      THEMES AND MESSAGING:
      [Your analysis of common themes and messaging patterns]
      
      STYLISTIC ELEMENTS:
      [Your analysis of design patterns and visual approaches]
      
      TONE AND EMOTION:
      [Your analysis of emotional appeals and tone]
      
      COPYWRITING TECHNIQUES:
      [Your analysis of effective copywriting techniques]
      
      DIFFERENTIATION OPPORTUNITIES:
      [Your suggestions for standing out while incorporating successful elements]`;
      
      const response = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 2000,
        messages: [
          { role: "user", content: prompt }
        ],
      });
      
      const analysisOutput = typeof response.content[0] === 'object' && 'text' in response.content[0] 
        ? response.content[0].text 
        : typeof response.content[0] === 'string' 
          ? response.content[0] 
          : '';
      
      // Extract style and copy inspirations
      const styleInspirations = adsWithStyles
        .filter(ad => ad.style_description)
        .map(ad => `${ad.brand}: ${ad.style_description}`)
        .join('\n\n');
        
      const copyInspirations = adsWithStyles
        .filter(ad => ad.headline || ad.body)
        .map(ad => `${ad.brand}: ${ad.headline || ''} - ${ad.body || ''}${ad.cta ? ` (CTA: ${ad.cta})` : ''}`)
        .join('\n\n');
      
      return res.status(200).json({
        ads: adsWithStyles,
        styleInspirations,
        copyInspirations,
        analysis: analysisOutput
      });
      
    } catch (error) {
      console.error('Error analyzing competitor ads:', error);
      return res.status(500).json({ error: `Failed to analyze competitor ads: ${(error as Error).message}` });
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
      
      const userId = (req.user as any)?.id;
      
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
  
  // Configure Google Custom Search API credentials
  app.post('/api/ad-inspiration/configure-google-search', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { apiKey, cseId } = req.body;
      
      if (!apiKey || !cseId) {
        return res.status(400).json({ 
          error: 'Both Google API Key and CSE ID are required' 
        });
      }
      
      // Get the user ID from the authenticated session
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User must be authenticated' });
      }
      
      // In production, these would be securely stored in a database
      // For this implementation, we'll store them in environment variables
      process.env.GOOGLE_API_KEY = apiKey;
      process.env.GOOGLE_CSE_ID = cseId;
      
      console.log('Google Custom Search API credentials configured');
      
      return res.status(200).json({
        message: 'Google Custom Search API credentials successfully configured',
        configured: true
      });
      
    } catch (error) {
      console.error('Error configuring Google Custom Search API:', error);
      return res.status(500).json({ 
        error: `Failed to configure Google Custom Search API: ${(error as Error).message}` 
      });
    }
  });
  
  // Get Google Custom Search API configuration status
  app.get('/api/ad-inspiration/google-search-status', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get the user ID from the authenticated session
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User must be authenticated' });
      }
      
      const isConfigured = !!(process.env.GOOGLE_API_KEY && process.env.GOOGLE_CSE_ID);
      
      return res.status(200).json({
        configured: isConfigured
      });
      
    } catch (error) {
      console.error('Error checking Google Custom Search API configuration:', error);
      return res.status(500).json({ 
        error: `Failed to check Google Custom Search API configuration: ${(error as Error).message}` 
      });
    }
  });
  
  // Test the Google Custom Search API
  app.get('/api/ad-inspiration/test-google-search', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get the user ID from the authenticated session
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User must be authenticated' });
      }
      
      // Check if Google Search API is configured
      const isConfigured = !!(process.env.GOOGLE_API_KEY && process.env.GOOGLE_CSE_ID);
      
      if (!isConfigured) {
        return res.status(400).json({ 
          error: 'Google Custom Search API is not configured. Please configure it in Settings.' 
        });
      }
      
      // Use a test brand to verify the API works
      const testBrand = 'Nike';
      const { getGoogleAdsForAdvertiser } = await import('./google_ads_transparency');
      
      // Get test results without saving to database
      const testResults = await getGoogleAdsForAdvertiser(testBrand, {
        maxAds: 3 // Limit to 3 results for this test
      });
      
      return res.status(200).json({
        success: true,
        message: `Successfully tested Google Custom Search API with query "${testBrand}"`,
        count: testResults.length,
        results: testResults.slice(0, 2) // Only return 2 sample results
      });
      
    } catch (error) {
      console.error('Error testing Google Custom Search API:', error);
      return res.status(500).json({ 
        error: `Failed to test Google Custom Search API: ${(error as Error).message}` 
      });
    }
  });
  
  console.log('Ad Inspiration integration routes registered');
}