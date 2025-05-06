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
import { scrapeGoogleAdsForAdvertiser } from './google_ads_transparency';
import { db } from '../db';
import { competitorAds } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Register competitor ad inspiration API routes
 */
export function registerCompetitorAdRoutes(app: any) {
  // Route to serve the diagnostic viewer HTML page
  app.get('/google-ads-diagnostic', (req: Request, res: Response) => {
    const path = require('path');
    res.sendFile(path.join(__dirname, 'diagnostic-viewer.html'));
  });
  
  // Route to serve files from the temp directory
  app.get('/temp/:filename', (req: Request, res: Response) => {
    const fs = require('fs');
    const path = require('path');
    
    const filename = req.params.filename;
    const filePath = path.join('./temp', filename);
    
    // Basic security check to prevent directory traversal
    if (filename.includes('..') || !filename) {
      return res.status(400).send('Invalid filename');
    }
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
      return res.sendFile(path.resolve(filePath));
    } else {
      return res.status(404).send('File not found');
    }
  });
  
  // Route to list files in the temp directory
  app.get('/temp', (req: Request, res: Response) => {
    const fs = require('fs');
    
    try {
      if (fs.existsSync('./temp')) {
        const files = fs.readdirSync('./temp');
        return res.json({ files });
      } else {
        return res.json({ files: [] });
      }
    } catch (error) {
      console.error('Error listing temp directory:', error);
      return res.status(500).json({ error: 'Failed to list temp directory' });
    }
  });
  // Diagnostic endpoint to test Google Ads Transparency Center scraping
  app.get('/api/ad-inspiration/diagnostic/google', async (req: Request, res: Response) => {
    // Get optional query parameters 
    const advertiserQuery = req.query.advertiser as string || 'AR18054737239162880'; // Default to Google's advertiser ID
    const region = req.query.region as string || 'US';
    const maxAds = parseInt(req.query.maxAds as string || '3');
    const searchTypeParam = req.query.searchType as string || 'brand';
    const timeoutParam = parseInt(req.query.timeout as string || '45000');
    
    // Set a longer timeout to prevent long-running requests
    let timeoutHandle: NodeJS.Timeout | null = setTimeout(() => {
      console.log(`[GoogleAdsDiagnostic] Diagnostic test timed out after ${timeoutParam/1000} seconds`);
      timeoutHandle = null;
      res.status(504).json({
        success: false,
        error: `Diagnostic test timed out after ${timeoutParam/1000} seconds`,
        query: {
          advertiser: advertiserQuery,
          region,
          maxAds,
          searchType: searchTypeParam,
          timeout: timeoutParam
        },
        timeStamp: new Date().toISOString()
      });
    }, timeoutParam + 5000); // Add 5 seconds to the timeout to ensure proper cleanup
    
    try {
      // Allow non-authenticated access for easier testing
      console.log(`[GoogleAdsDiagnostic] Diagnostic test requested by IP: ${req.ip}`);
      console.log(`[GoogleAdsDiagnostic] Parameters: advertiser=${advertiserQuery}, region=${region}, searchType=${searchTypeParam}, maxAds=${maxAds}, timeout=${timeoutParam}ms`);
      
      console.log('[GoogleAdsDiagnostic] Running diagnostic test...');
      
      // Create temp directory for screenshots if it doesn't exist
      try {
        const fs = require('fs').promises;
        await fs.mkdir('./temp', { recursive: true });
        console.log('[GoogleAdsDiagnostic] Temp directory created or already exists');
      } catch (dirError) {
        console.error(`[GoogleAdsDiagnostic] Error creating temp directory: ${dirError}`);
      }
      
      // Run the scraper with detailed logging
      console.log(`[GoogleAdsDiagnostic] Testing scraper with advertiser: ${advertiserQuery}`);
      
      const startTime = Date.now();
      const scrapingResult = await scrapeGoogleAdsForAdvertiser(advertiserQuery, {
        region,
        maxAds,
        searchType: searchTypeParam as 'brand' | 'keyword' | 'industry',
        timeout: timeoutParam
      });
      const endTime = Date.now();
      
      // Track performance metrics
      const scrapingDuration = (endTime - startTime) / 1000;
      
      // Find any screenshots that were created during the scraping
      let screenshots = [];
      try {
        const fs = require('fs');
        const files = await fs.promises.readdir('./temp');
        screenshots = files
          .filter((file: string) => file.startsWith('google-ads-') && file.endsWith('.png'))
          .map((file: string) => `/temp/${file}`);
        console.log(`[GoogleAdsDiagnostic] Found ${screenshots.length} screenshots`);
      } catch (readError) {
        console.error(`[GoogleAdsDiagnostic] Error reading temp directory: ${readError}`);
      }
      
      // Clear timeout since we're responding
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      
      // Define the response type with proper TypeScript interface
      interface DiagnosticResponse {
        success: boolean;
        query: {
          advertiser: string;
          region: string;
          maxAds: number;
          searchType: string;
        };
        message?: string;
        duration: number;
        adCount: number;
        timeStamp: string;
        environment: {
          nodeVersion: string;
          platform: string;
          arch: string;
          chromiumPath: string;
        };
        googleUrl: string;
        screenshots: string[];
        sampleData?: any[];
        ads?: any[];
        debugInfo?: any;
      }
      
      // Build detailed diagnostic response
      const diagnosticResponse: DiagnosticResponse = {
        success: scrapingResult && scrapingResult.length > 0,
        query: {
          advertiser: advertiserQuery,
          region,
          maxAds,
          searchType: searchTypeParam
        },
        duration: scrapingDuration,
        adCount: scrapingResult.length,
        timeStamp: new Date().toISOString(),
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          chromiumPath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        },
        googleUrl: `https://adstransparency.google.com/advertiser/${advertiserQuery}?region=${region}`,
        screenshots
      };
      
      if (scrapingResult && scrapingResult.length > 0) {
        console.log(`[GoogleAdsDiagnostic] Success! Found ${scrapingResult.length} ads in ${scrapingDuration.toFixed(2)} seconds`);
        
        // Include the first ad as a sample in the response if we found any
        diagnosticResponse.message = `Found ${scrapingResult.length} ads for ${advertiserQuery}`;
        diagnosticResponse.sampleData = scrapingResult.slice(0, 1);
        
        return res.json(diagnosticResponse);
      } else {
        console.log(`[GoogleAdsDiagnostic] Failed to find any ads in ${scrapingDuration.toFixed(2)} seconds`);
        
        diagnosticResponse.message = `No ads found for ${advertiserQuery}. This suggests that the scraper is being blocked or the selectors need to be updated.`;
        diagnosticResponse.ads = [];
        
        // Look for screenshot files that might contain helpful debugging information
        try {
          const fs = require('fs');
          // Check if screenshots are available
          if (screenshots.length > 0) {
            diagnosticResponse.debugInfo = "Check the screenshots for visual cues on what might be wrong.";
          } else {
            // Read text content from the webpage for debugging
            const htmlContentPath = './temp/google-ads-page-source.txt';
            try {
              // Save the current page HTML for debugging
              const htmlContent = await fs.promises.readFile(htmlContentPath, 'utf8');
              const contentPreview = htmlContent.substring(0, 500) + '...';
              diagnosticResponse.debugInfo = {
                htmlContentPreview: contentPreview,
                possibleIssues: [
                  "Google may be detecting the automation",
                  "Page structure might have changed",
                  "IP address may be rate limited or blocked",
                  "CAPTCHA or verification challenge may be present"
                ]
              };
            } catch (readError) {
              diagnosticResponse.debugInfo = {
                note: "No HTML content available for debugging",
                possibleIssues: [
                  "Google may be detecting the automation",
                  "Page structure might have changed",
                  "IP address may be rate limited or blocked",
                  "CAPTCHA or verification challenge may be present"
                ]
              };
            }
          }
        } catch (debugError) {
          console.error(`[GoogleAdsDiagnostic] Error getting debug info: ${debugError}`);
        }
        
        return res.json(diagnosticResponse);
      }
    } catch (error) {
      console.error(`[GoogleAdsDiagnostic] Error running diagnostic: ${error}`);
      
      // Clear the timeout since we're responding with an error
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      
      return res.status(500).json({
        success: false,
        error: `Diagnostic test failed: ${(error as Error).message}`,
        details: {
          message: (error as Error).message,
          stack: (error as Error).stack,
        },
        query: {
          advertiser: advertiserQuery,
          region,
          maxAds,
          searchType: searchTypeParam,
          timeout: timeoutParam
        },
        timeStamp: new Date().toISOString()
      });
    }
  });
  // Search for competitor ads with improved error handling
  app.post('/api/ad-inspiration/search', isAuthenticated, async (req: Request, res: Response) => {
    // Declare the timeout handle at the top level of the function
    let searchTimeoutHandle: NodeJS.Timeout | null = null;
    
    try {
      // Log the request for debugging
      console.log(`[AdInspirationAPI] Received search request:`, {
        body: req.body,
        user: (req.user as any)?.username || 'unknown',
        userId: (req.user as any)?.id || 'unknown'
      });
      
      // Set timeout to prevent long-running requests
      searchTimeoutHandle = setTimeout(() => {
        console.log(`[AdInspirationAPI] Search timed out after 40 seconds`);
        searchTimeoutHandle = null;
        res.status(504).json({
          error: 'Search timed out after 40 seconds',
          details: 'The search operation took too long to complete. Please try a different search term or try again later.',
          timeStamp: new Date().toISOString()
        });
      }, 40000); // 40 second timeout
      
      const { query, searchType, platforms, region } = req.body;
      
      if (!query) {
        console.log(`[AdInspirationAPI] Error: Missing search query`);
        return res.status(400).json({ error: 'Search query is required' });
      }

      if (!searchType || !['brand', 'keyword', 'industry'].includes(searchType)) {
        console.log(`[AdInspirationAPI] Error: Invalid search type: ${searchType}`);
        return res.status(400).json({ error: 'Valid search type is required: brand, keyword, or industry' });
      }

      const userId = (req.user as any)?.id;
      
      if (!userId) {
        console.log(`[AdInspirationAPI] Error: Unauthenticated request`);
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      console.log(`[AdInspirationAPI] Starting search for "${query}" (type: ${searchType}) by user ${userId}`);
      
      // Execute search with platforms filtering
      const result = await searchCompetitorAds(
        query,
        searchType as 'brand' | 'keyword' | 'industry',
        {
          userId,
          platforms: platforms || ['meta', 'google'],
          region: region || 'US',
          limit: 20
        }
      );

      console.log(`[AdInspirationAPI] Search complete for "${query}". Found ${result.ads.length} ads. SearchId: ${result.searchId}`);
      
      // Clear the timeout since we're responding successfully
      if (searchTimeoutHandle) {
        clearTimeout(searchTimeoutHandle);
        searchTimeoutHandle = null;
      }
      
      // Return successful response in clean JSON format
      return res.status(200).json({
        success: true,
        count: result.ads.length,
        searchId: result.searchId,
        ads: result.ads
      });
    
    } catch (error) {
      console.error('[AdInspirationAPI] Error searching ads:', error);
      // Log details for troubleshooting
      if (error instanceof Error) {
        console.error('[AdInspirationAPI] Error stack:', error.stack);
      }
      
      // Clear the timeout since we're responding with an error
      if (searchTimeoutHandle) {
        clearTimeout(searchTimeoutHandle);
        searchTimeoutHandle = null;
      }
      
      return res.status(500).json({ 
        error: 'Failed to search ads',
        details: (error as Error).message 
      });
    }
  });

  // Get ad inspiration search results  
  app.get('/api/ad-inspiration/results', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const query = req.query.query as string;
      const queryType = req.query.queryType as string;
      const platforms = req.query.platforms ? (req.query.platforms as string).split(',') : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const region = req.query.region as string;
      
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
  
  console.log('Ad Inspiration integration routes registered');
}