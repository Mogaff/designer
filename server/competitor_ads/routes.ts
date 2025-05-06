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
import { competitorAds, CompetitorAd } from '@shared/schema';
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
      
      try {
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
      } catch (searchError) {
        // Check for specific errors related to Google API configuration
        if (searchError instanceof Error) {
          const errorMessage = searchError.message;
          
          // Handle Google OAuth errors specifically
          if (errorMessage.includes('Google OAuth is not configured') || 
              errorMessage.includes('Could not refresh access token') ||
              errorMessage.includes('ECONNREFUSED 169.254.169.254')) {
            
            console.warn('Google OAuth error during ad search:', errorMessage);
            
            // Return a more user-friendly error, but with a 200 status since this is a "soft error"
            return res.status(200).json({
              message: `Limited results for ${queryType}: "${query}" - Google API not available`,
              warning: "Google Search API is not accessible in this environment. Using alternative sources.",
              searchId: null,
              count: 0,
              ads: [],
              googleApiError: true
            });
          }
        }
        
        // Re-throw any other errors to be caught by the outer catch block
        throw searchError;
      }
    } catch (error) {
      console.error('Error in ad inspiration search:', error);
      
      // Use 200 status to avoid breaking the UI with a failed request
      // The client can still detect the error from the 'error' property
      return res.status(200).json({ 
        error: `Search failed: ${(error instanceof Error ? error.message : 'Unknown error')}`,
        message: "An error occurred while searching for competitor ads. Please try again later.",
        count: 0,
        ads: [],
        details: error instanceof Error ? error.stack : undefined
      });
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
      return res.status(200).json({ 
        error: `Failed to fetch recent searches: ${(error as Error).message}`,
        searches: []
      });
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
      return res.status(200).json({
        error: `Failed to fetch ads: ${(error as Error).message}`,
        count: 0,
        ads: []
      });
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
      return res.status(200).json({ 
        error: `Failed to fetch ad: ${(error as Error).message}`,
        ad: null
      });
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
      
      try {
        // Get inspiration
        const ads = await getAdInspiration({
          industry,
          brand,
          keyword,
          userId,
          limit: limit || 5
        });
        
        if (ads.length === 0) {
          return res.status(200).json({
            count: 0,
            ads: [],
            message: `No inspiration found for ${brand || industry || keyword}. Try a different search term.`,
            styleInspiration: '',
            copyInspiration: ''
          });
        }
        
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
      } catch (inspirationError) {
        // Check if this is a Google OAuth error that we can handle gracefully
        if (inspirationError instanceof Error) {
          const errorMessage = inspirationError.message;
          
          if (errorMessage.includes('Google OAuth') ||
              errorMessage.includes('ECONNREFUSED 169.254.169.254') ||
              errorMessage.includes('Could not refresh access token')) {
            
            console.warn('Google OAuth error during ad inspiration:', errorMessage);
            
            // Try to fallback to database-only results instead of failing entirely
            const { getAdsFromDatabase } = await import('./ad_inspiration');
            const fallbackAds = await getAdsFromDatabase({
              industry,
              brand,
              keyword,
              userId, // Add required userId parameter
              limit: limit || 5
            });
            
            if (fallbackAds.length > 0) {
              // Generate style descriptions for any ads that don't have them
              const adsWithStyles = await Promise.all(
                fallbackAds.map(async (ad: CompetitorAd) => {
                  if (!ad.style_description) {
                    ad.style_description = await generateStyleDescription(ad);
                  }
                  return ad;
                })
              );
              
              return res.status(200).json({
                count: adsWithStyles.length,
                ads: adsWithStyles,
                googleApiError: true,
                message: "Using database results only. Google API is not available in this environment.",
                // Extract style descriptions for use in AI prompts
                styleInspiration: adsWithStyles
                  .filter((ad: CompetitorAd) => ad.style_description)
                  .map((ad: CompetitorAd) => `${ad.brand}: ${ad.style_description}`)
                  .join('\n\n'),
                // Extract copywriting patterns for use in AI prompts  
                copyInspiration: adsWithStyles
                  .filter((ad: CompetitorAd) => ad.headline || ad.body)
                  .map((ad: CompetitorAd) => `${ad.brand}: ${ad.headline || ''} - ${ad.body || ''}${ad.cta ? ` (CTA: ${ad.cta})` : ''}`)
                  .join('\n\n')
              });
            }
          }
        }
        
        // If we couldn't handle the error specifically, re-throw it
        throw inspirationError;
      }
    } catch (error) {
      console.error('Error getting ad inspiration:', error);
      
      // Return a more descriptive error and make sure it's a 200 status to avoid breaking the UI
      return res.status(200).json({ 
        error: `Failed to get ad inspiration: ${error instanceof Error ? error.message : String(error)}`,
        count: 0,
        ads: [],
        message: "An error occurred while generating inspiration. Please try a different term.",
        styleInspiration: '',
        copyInspiration: ''
      });
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
      return res.status(200).json({
        error: `Failed to analyze competitor ads: ${(error as Error).message}`,
        ads: [],
        styleInspirations: '',
        copyInspirations: '',
        analysis: 'Error generating analysis. Please try again with different ads.'
      });
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
      
      // Always use status 200 for errors to avoid breaking the UI
      // The client can still check for the error property
      return res.status(200).json({ 
        error: `Failed to enhance prompt: ${error instanceof Error ? error.message : String(error)}`,
        originalPrompt: req.body.promptText,
        enhancedPrompt: req.body.promptText, // Fall back to original prompt
        errorOccurred: true,
        message: "Unable to generate competitor insights. Using original prompt instead."
      });
    }
  });
  
  // Configure Google Custom Search API credentials
  app.post('/api/ad-inspiration/configure-google-search', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { cseId } = req.body;
      
      if (!cseId) {
        return res.status(400).json({ 
          error: 'Google Custom Search Engine ID is required' 
        });
      }
      
      // Get the user ID from the authenticated session
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User must be authenticated' });
      }
      
      // We only need to store the CSE ID as we're using OAuth for authentication
      process.env.GOOGLE_CSE_ID = cseId;
      
      console.log('Google Custom Search Engine ID configured');
      
      // Import the OAuth check function
      const { checkGoogleOAuthConfig } = await import('../services/googleOAuth');
      
      // Check if OAuth is configured correctly
      const isOAuthConfigured = await checkGoogleOAuthConfig();
      
      return res.status(200).json({
        message: `Google Search API configuration ${isOAuthConfigured ? 'successful' : 'partially successful (OAuth not configured)'}`,
        configured: true,
        oauthConfigured: isOAuthConfigured
      });
      
    } catch (error) {
      console.error('Error configuring Google Search API:', error);
      
      // Use a more descriptive error message based on the type of error
      let errorMessage = `Failed to configure Google Search API`;
      let envLimitation = false;
      
      if (error instanceof Error) {
        const message = error.message;
        
        if (message.includes('ECONNREFUSED 169.254.169.254') || 
            message.includes('compute/metadata')) {
          errorMessage = "Google OAuth requires a Google Cloud environment, which is not available in Replit.";
          envLimitation = true;
        } else if (message.includes('Could not refresh access token')) {
          errorMessage = "Unable to authenticate with Google APIs in this environment.";
          envLimitation = true;
        } else {
          errorMessage += `: ${message}`;
        }
      }
      
      // Return status 200 to avoid breaking the UI
      return res.status(200).json({ 
        error: errorMessage,
        configured: false,
        envLimitation,
        cseConfigured: !!process.env.GOOGLE_CSE_ID
      });
    }
  });
  
  // Get Google Search API configuration status using OAuth
  app.get('/api/ad-inspiration/google-search-status', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get the user ID from the authenticated session
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User must be authenticated' });
      }
      
      try {
        // Import the necessary functions
        const { checkGoogleApiKeys } = await import('./google_ads_transparency');
        
        // Check if Google OAuth and CSE ID are configured
        const isConfigured = await checkGoogleApiKeys();
        
        // Get the OAuth status separately to provide more detailed information
        const { checkGoogleOAuthConfig } = await import('../services/googleOAuth');
        const isOAuthConfigured = await checkGoogleOAuthConfig();
        const hasCseId = !!process.env.GOOGLE_CSE_ID;
        
        return res.status(200).json({
          configured: isConfigured,
          oauthConfigured: isOAuthConfigured,
          cseIdConfigured: hasCseId,
          message: isConfigured 
            ? "Google Search API is fully configured" 
            : isOAuthConfigured && !hasCseId 
              ? "Google OAuth is configured, but Custom Search Engine ID is missing"
              : !isOAuthConfigured && hasCseId
                ? "Custom Search Engine ID is configured, but Google OAuth is missing"
                : "Google Search API is not configured"
        });
      } catch (oauthError) {
        // If there's a specific error related to OAuth environment limitations, handle it gracefully
        console.warn('OAuth error checking Google Search API status:', oauthError);
        
        const errorMessage = oauthError instanceof Error ? oauthError.message : String(oauthError);
        let userFriendlyMessage = "Google Search API authentication unavailable in this environment.";
        
        // Check for specific error types to provide better messages
        if (errorMessage.includes('ECONNREFUSED 169.254.169.254') || 
            errorMessage.includes('compute/metadata')) {
          userFriendlyMessage = "Google OAuth requires a Google Cloud environment, which is not available in Replit.";
        } else if (errorMessage.includes('Could not refresh access token')) {
          userFriendlyMessage = "Unable to authenticate with Google APIs. Using alternative data sources only.";
        }
        
        // Return a 200 status with detailed error information, but as a non-critical error
        return res.status(200).json({
          configured: false,
          oauthConfigured: false,
          cseIdConfigured: !!process.env.GOOGLE_CSE_ID,
          message: userFriendlyMessage,
          envLimitation: true  // Flag to indicate this is an environment limitation, not a configuration error
        });
      }
    } catch (error) {
      console.error('Error checking Google Search API configuration:', error);
      // Convert error to a more user-friendly format and return 200 instead of 500
      // to avoid breaking the UI when this endpoint is polled
      return res.status(200).json({ 
        configured: false,
        oauthConfigured: false,
        cseIdConfigured: false,
        message: `Google Search API unavailable: ${error instanceof Error ? error.message : String(error)}`,
        error: true
      });
    }
  });
  
  // Test the Google Search API using OAuth
  app.get('/api/ad-inspiration/test-google-search', isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get the user ID from the authenticated session
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User must be authenticated' });
      }
      
      try {
        // Import the check function
        const { checkGoogleApiKeys } = await import('./google_ads_transparency');
        
        // Check if Google OAuth and CSE ID are configured
        const isConfigured = await checkGoogleApiKeys();
        
        if (!isConfigured) {
          // Get detailed configuration status for better error message
          const { checkGoogleOAuthConfig } = await import('../services/googleOAuth');
          const isOAuthConfigured = await checkGoogleOAuthConfig();
          const hasCseId = !!process.env.GOOGLE_CSE_ID;
          
          let errorMessage = 'Google Search API is not configured. ';
          
          if (!isOAuthConfigured && !hasCseId) {
            errorMessage += 'Both OAuth and Custom Search Engine ID are missing.';
          } else if (!isOAuthConfigured) {
            errorMessage += 'OAuth is not configured.';
          } else if (!hasCseId) {
            errorMessage += 'Custom Search Engine ID is missing.';
          }
          
          return res.status(200).json({ 
            success: false,
            error: errorMessage,
            environmentIssue: false
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
          message: `Successfully tested Google Search API with query "${testBrand}"`,
          count: testResults.length,
          results: testResults.slice(0, 2) // Only return 2 sample results
        });
      
      } catch (oauthError) {
        // Specifically handle OAuth-related errors to provide better feedback
        console.warn('OAuth error during Google API test:', oauthError);
        
        const errorMessage = oauthError instanceof Error ? oauthError.message : String(oauthError);
        let userFriendlyMessage = "Google Search API test failed due to authentication issues.";
        let environmentIssue = false;
        
        // Check for specific error types and provide better messages
        if (errorMessage.includes('ECONNREFUSED 169.254.169.254') || 
            errorMessage.includes('compute/metadata')) {
          userFriendlyMessage = "Google OAuth requires a Google Cloud environment, which is not available in this environment.";
          environmentIssue = true;
        } else if (errorMessage.includes('Could not refresh access token')) {
          userFriendlyMessage = "Unable to authenticate with Google APIs. Token refresh failed.";
          environmentIssue = true;
        }
        
        return res.status(200).json({ 
          success: false,
          error: userFriendlyMessage,
          environmentIssue,
          technicalDetails: errorMessage
        });
      }
    } catch (error) {
      console.error('Error testing Google Search API:', error);
      
      // Return more detailed error information
      return res.status(200).json({ 
        success: false,
        error: `Failed to test Google Search API: ${error instanceof Error ? error.message : String(error)}`,
        environmentIssue: false,
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });
  
  console.log('Ad Inspiration integration routes registered');
}