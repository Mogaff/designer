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
  // Search for competitor ads (POST route)
  app.post('/api/ad-inspiration/search', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { query, searchType, region } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
  
      if (!searchType || !['brand', 'keyword', 'industry'].includes(searchType)) {
        return res.status(400).json({ error: 'Valid search type is required' });
      }
  
      const userId = (req.user as any)?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User must be authenticated' });
      }
      
      // Start the search using searchCompetitorAds
      const result = await searchCompetitorAds(
        query,
        searchType as 'brand' | 'keyword' | 'industry',
        {
          userId,
          limit: 20,
          region: region || 'US'
        }
      );
      
      return res.status(200).json({
        message: `Found ${result.ads.length} ads for ${searchType}: "${query}"`,
        searchId: result.searchId,
        count: result.ads.length,
        ads: result.ads.slice(0, 10), // Return only first 10 to keep response size small
      });
      
    } catch (error) {
      console.error('Error in ad inspiration search:', error);
      return res.status(500).json({ error: `Search failed: ${(error as Error).message}` });
    }
  });
  
  // Simple test endpoint for Google Ads search that returns synthetic data for testing the UI
  app.get('/api/ad-inspiration/test-search', async (req: Request, res: Response) => {
    try {
      // Support both 'query' and 'q' parameters for flexibility
      const query = (req.query.query || req.query.q) as string;
      const queryType = req.query.queryType as 'brand' | 'keyword' | 'industry';
      
      console.log(`Test search request: ${queryType} "${query}"`);
      
      // Generate ad templates based on industry and query type
      const adTemplates = {
        tech: {
          headlines: ["Introducing the Next Generation", "Innovation Redefined", "Tech that Transforms"],
          bodies: ["Experience cutting-edge technology designed for the modern world. Discover what's possible.", 
                  "Powerful performance meets elegant design. Elevate your digital experience today.",
                  "Smart solutions for a connected world. See how our technology can transform your everyday."],
          ctas: ["Learn More", "Shop Now", "Discover Features"]
        },
        fashion: {
          headlines: ["Discover the New Collection", "Style Redefined", "Elevate Your Wardrobe"],
          bodies: ["Curated pieces designed for the modern lifestyle. Express yourself with our latest collection.", 
                  "Where comfort meets style. Explore our newest arrivals for the season.",
                  "Handcrafted with precision and care. Find your signature look today."],
          ctas: ["Shop Collection", "View Lookbook", "Find Your Style"]
        },
        food: {
          headlines: ["Taste the Difference", "Culinary Excellence", "Flavors that Inspire"],
          bodies: ["Crafted with the finest ingredients. Experience a taste sensation like no other.", 
                  "From our kitchen to your table. Discover a world of flavor in every bite.",
                  "Thoughtfully sourced, expertly prepared. Elevate your dining experience today."],
          ctas: ["Order Now", "View Menu", "Find Locations"]
        },
        default: {
          headlines: ["Discover What's New", "Quality and Excellence", "Designed for You"],
          bodies: ["Exceptional quality and service that exceeds expectations. See the difference today.", 
                  "Crafted with precision and care. Experience the best in class.",
                  "Innovation meets tradition. Discover why we're the leaders in our field."],
          ctas: ["Learn More", "Shop Now", "Contact Us"]
        }
      };
      
      // Determine the brand based on query or queryType
      let brand = query;
      
      // If queryType is industry, use a different approach
      if (queryType === "industry") {
        // Industry-specific major brands
        const industryBrands = {
          tech: ["Apple", "Microsoft", "Google", "Samsung"],
          fashion: ["Nike", "Adidas", "Zara", "H&M"],
          food: ["McDonald's", "Starbucks", "Coca-Cola", "Nestlé"],
          default: ["Amazon", "Walmart", "Target", "IKEA"]
        };
        
        // Get brands for this industry or use default
        const brands = industryBrands[query.toLowerCase() as keyof typeof industryBrands] || 
                      industryBrands.default;
        
        // Set the brand to be one from the industry
        brand = brands[Math.floor(Math.random() * brands.length)];
      }
      
      // Select the appropriate template based on industry
      const industry = query.toLowerCase();
      const template = adTemplates[industry as keyof typeof adTemplates] || adTemplates.default;
      
      // Randomly select content from templates
      const randomIndex = Math.floor(Math.random() * template.headlines.length);
      
      // Return real ad structure with test data based on the query
      // This uses real structure with appropriate data for testing
      const testAds = [
        {
          id: 1001,
          platform: "Google",
          brand: brand,
          headline: template.headlines[randomIndex % template.headlines.length],
          body: template.bodies[randomIndex % template.bodies.length],
          image_url: "https://placehold.co/600x400?text=" + encodeURIComponent(brand) + "&font=roboto",
          thumbnail_url: "https://placehold.co/300x200?text=" + encodeURIComponent(brand) + "&font=roboto",
          cta: template.ctas[randomIndex % template.ctas.length],
          start_date: null,
          platform_details: "YouTube, Display Network",
          ad_id: "google-" + Math.floor(Math.random() * 100000),
          page_id: "AR" + Math.floor(Math.random() * 1000000000000000000),
          snapshot_url: "",
          fetched_by_user_id: null,
          industry: queryType === "industry" ? query : (industry || "General"),
          tags: ["advertising", "digital marketing", industry],
          is_active: true,
          style_description: `Modern design with engaging visuals for ${brand}. Uses ${industry === "tech" ? "a sleek, minimalist" : industry === "fashion" ? "a bold, colorful" : "a professional"} layout with strategic typography and high-quality imagery to highlight the product features and benefits.`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            lastSeen: "2025-05-01"
          }
        },
        {
          id: 1002,
          platform: "Google", 
          brand: brand,
          headline: template.headlines[(randomIndex + 1) % template.headlines.length],
          body: template.bodies[(randomIndex + 1) % template.bodies.length],
          image_url: "https://placehold.co/600x400?text=" + encodeURIComponent(brand + " Ad") + "&font=roboto",
          thumbnail_url: "https://placehold.co/300x200?text=" + encodeURIComponent(brand + " Ad") + "&font=roboto",
          cta: template.ctas[(randomIndex + 1) % template.ctas.length],
          start_date: null,
          platform_details: "Display Network",
          ad_id: "google-" + Math.floor(Math.random() * 100000),
          page_id: "AR" + Math.floor(Math.random() * 1000000000000000000),
          snapshot_url: "",
          fetched_by_user_id: null,
          industry: queryType === "industry" ? query : (industry || "General"),
          tags: ["advertising", "digital marketing", industry],
          is_active: true,
          style_description: `${industry === "tech" ? "Clean, technical aesthetic" : industry === "fashion" ? "Vibrant, lifestyle-focused design" : "Professional, brand-forward layout"} that emphasizes ${brand}'s core values. The ad uses ${industry === "tech" ? "dark mode with accent colors" : industry === "fashion" ? "dynamic imagery with bold typography" : "balanced composition with clear hierarchy"} to create a compelling visual narrative.`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            lastSeen: "2025-05-02"
          }
        }
      ];
      
      console.log(`Returning ${testAds.length} test ads for search: ${queryType} "${query}"`);
      
      return res.status(200).json({
        message: `Found ${testAds.length} ads for ${queryType}: "${query}"`,
        searchId: -1, // Dummy value since we're not storing in the database
        count: testAds.length,
        ads: testAds
      });
    } catch (error) {
      console.error('Error in test ad inspiration search:', error);
      return res.status(500).json({ error: `Test search failed: ${(error as Error).message}` });
    }
  });
  
  // Search for competitor ads (GET route for client usage - redirects to test endpoint temporarily)
  app.get('/api/ad-inspiration/search', async (req: Request, res: Response) => {
    try {
      // Support both 'query' and 'q' parameters for flexibility
      const query = (req.query.query || req.query.q) as string;
      const queryType = req.query.queryType as 'brand' | 'keyword' | 'industry';
      const platforms = req.query.platforms ? (req.query.platforms as string).split(',') : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const region = req.query.region as string;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
  
      if (!queryType || !['brand', 'keyword', 'industry'].includes(queryType)) {
        return res.status(400).json({ error: 'Valid queryType is required (brand, keyword, or industry)' });
      }
      
      console.log(`GET search request: ${queryType} "${query}"`);
      
      // TEMPORARY SOLUTION: Redirect to test endpoint while debugging Google API
      // Forward to the test endpoint
      req.url = req.url.replace('/api/ad-inspiration/search', '/api/ad-inspiration/test-search');
      return app._router.handle(req, res);
      
      /* REAL IMPLEMENTATION - temporarily commented out
      try {
        console.log(`Searching Google Ads for: ${queryType} "${query}"`);
        
        // Für Testzwecke direkt die Google API aufrufen
        const searchTerm = queryType === 'brand' ? query : 
                         (queryType === 'industry' ? query + ' companies' : query);
        
        // Für direkten API-Aufruf importieren
        const { searchGoogleAds } = await import('./google_ads_transparency');
        
        // Wir umgehen hier die Datenbank-Operationen und rufen die API direkt auf
        const googleAds = await searchGoogleAds(searchTerm, {
          queryType,
          maxAds: limit || 10,
          region: region || 'US'
        });
        
        console.log(`Found ${googleAds.length} ads for search: ${queryType} "${query}"`);
        
        return res.status(200).json({
          message: `Found ${googleAds.length} ads for ${queryType}: "${query}"`,
          searchId: -1, // Dummy-Wert, da wir keinen Eintrag in der Datenbank haben
          count: googleAds.length,
          ads: googleAds.slice(0, 10), // Return only first 10 to keep response size small
        });
      } catch (searchError) {
        console.error(`Error in Google ads search: ${(searchError as Error).message}`);
        // Fall back to detailed error response
        return res.status(500).json({ 
          error: `Search failed: ${(searchError as Error).message}`,
          errorStack: (searchError as Error).stack,
          query,
          queryType,
          errorDetails: "Fehler beim Abrufen echter Anzeigen. Bitte überprüfen Sie die Server-Logs für weitere Details."
        });
      }
      */
    } catch (error) {
      console.error('Error in ad inspiration search (GET):', error);
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