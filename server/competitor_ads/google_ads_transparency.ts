/**
 * Google Ads Transparency Center Scraper
 * Handles fetching competitor ads from Google's Ads Transparency Center
 * Using Puppeteer for web scraping (more reliable than Firecrawl)
 */

import puppeteer from 'puppeteer';
import { CompetitorAd, InsertCompetitorAd } from '@shared/schema';
import { db } from '../db';
import { competitorAds } from '@shared/schema';

// Google Ads Transparency Center URL
const GOOGLE_ADS_TRANSPARENCY_URL = 'https://adstransparency.google.com';

interface GoogleAdData {
  brand: string;
  headline?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  cta?: string | null;
  adId?: string;
  platformDetails?: string | null; // YouTube, Search, Display, etc.
  lastSeen?: string | null;
  advertiserId?: string;
}

interface ScrapingOptions {
  region?: string;
  maxAds?: number;
  timeout?: number;
}

/**
 * Scrape ads for a specific advertiser from Google's Ads Transparency Center
 * Using Puppeteer (more reliable than Firecrawl)
 */
export async function scrapeGoogleAdsForAdvertiser(
  searchQuery: string,
  options: ScrapingOptions & {
    searchType?: 'brand' | 'keyword' | 'industry';
  } = {}
): Promise<GoogleAdData[]> {
  const region = options.region || 'US';
  const maxAds = options.maxAds || 20;
  const timeout = options.timeout || 60000; // 60 seconds
  
  console.log(`Scraping Google Ads for advertiser: ${searchQuery} in region: ${region}`);
  
  // Handle different search types
  let searchUrl = '';
  const searchRegion = options.region || 'US';
  
  if (options.searchType === 'brand') {
    // Direct brand search
    searchUrl = `${GOOGLE_ADS_TRANSPARENCY_URL}/advertiser/${encodeURIComponent(searchQuery)}?region=${searchRegion}`;
  } else {
    // For keyword and industry searches, use the search endpoint
    searchUrl = `${GOOGLE_ADS_TRANSPARENCY_URL}/search?q=${encodeURIComponent(searchQuery)}&region=${searchRegion}`;
  }
  
  console.log(`Navigating to advertiser page: ${searchUrl}`);
  
  try {
    // Launch Puppeteer browser in headless mode with system Chromium
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ]
    });
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    
    // Set navigation timeout
    page.setDefaultNavigationTimeout(timeout);
    
    // Navigate to the advertiser page
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    
    // Wait for some time to let everything load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Page loaded, looking for ad cards...');
    
    // Extract data using our script
    const result = await page.evaluate(() => {
      // Find all ad card elements
      const adCardSelectors = [
        '.ad-card', 
        '.adCard', 
        '.ad-container', 
        '.adContainer',
        '[data-ad-id]',
        '[data-testid="ad-card"]',
        '.gtc-ad-card',
        '.ad_card'
      ];
      
      // Helper function to extract text from elements using multiple selectors
      const extractText = (element: Element, selectors: string[]): string | null => {
        for (const selector of selectors) {
          const el = element.querySelector(selector);
          if (el && el.textContent) {
            return el.textContent.trim();
          }
        }
        return null;
      };
      
      // Helper function for images
      const extractImage = (element: Element, selectors: string[]): string | null => {
        for (const selector of selectors) {
          const el = element.querySelector(selector) as HTMLImageElement;
          if (el && el.src) {
            return el.src;
          }
        }
        return null;
      };
      
      // Find all ad cards using the selectors
      let adCards: Element[] = [];
      for (const selector of adCardSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          adCards = elements;
          console.log('Found ' + elements.length + ' ads using selector: ' + selector);
          break;
        }
      }
      
      // Extract brand name
      const brandSelectors = [
        '.advertiser-name', 
        '.advertiserName', 
        '[data-testid="advertiser-name"]',
        '.brand-name',
        '.company-name',
        'h1'
      ];
      
      let brandName = 'Unknown';
      for (const selector of brandSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent) {
          brandName = el.textContent.trim();
          break;
        }
      }
      
      // Process each ad card
      const extractedAds = adCards.map((card, i) => {
        // Extract headline
        const headline = extractText(card, [
          '.ad-title', 
          '.adTitle', 
          '.ad-headline', 
          '[data-testid="ad-title"]',
          'h2', 
          'h3'
        ]);
        
        // Extract body text
        const body = extractText(card, [
          '.ad-description', 
          '.adDescription', 
          '.ad-body', 
          '.adBody',
          '[data-testid="ad-body"]',
          'p'
        ]);
        
        // Extract image URL
        const imageUrl = extractImage(card, ['img', '[data-testid="ad-image"]']);
        
        // Extract platform details
        const platformDetails = extractText(card, [
          '.ad-platform-badge', 
          '.adPlatform', 
          '.platform-badge',
          '[data-testid="ad-platform"]'
        ]);
        
        // Extract last seen date
        const lastSeen = extractText(card, [
          '.ad-last-seen', 
          '.adLastSeen', 
          '.last-seen',
          '[data-testid="ad-last-seen"]'
        ]);
        
        // Extract CTA
        const cta = extractText(card, [
          '.ad-cta', 
          '.adCta', 
          '.call-to-action',
          '[data-testid="ad-cta"]',
          'button'
        ]);
        
        // Try to get ad ID from data attribute or generate one
        let adId: string | null = null;
        if (card.hasAttribute('data-ad-id')) {
          adId = card.getAttribute('data-ad-id');
        } else {
          // Generate unique ID
          adId = 'google-ad-' + i;
        }
        
        return {
          headline,
          body,
          imageUrl,
          platformDetails,
          lastSeen,
          cta,
          adId
        };
      });
      
      return {
        ads: extractedAds,
        brandName,
        currentUrl: window.location.href
      };
    });
    
    // Take a screenshot for debugging (uncomment if needed)
    // await page.screenshot({ path: `debug-google-ads-${Date.now()}.png`, fullPage: true });
    
    // Close the browser
    await browser.close();
    
    // Check if we have valid results
    if (!result?.ads || result.ads.length === 0) {
      console.log(`No ads found for advertiser: ${searchQuery}`);
      return [];
    }
    
    // Extract the advertiser ID from the URL if available
    const currentUrl = result.currentUrl || '';
    const advertiserId = currentUrl.match(/advertiser\/(AR[0-9]+)/)?.[1];
    
    // Process the scraped data
    const brandName = result.brandName || 'Unknown';
    
    const extractedAds = result.ads
      .slice(0, maxAds)
      .map((card, index) => {
        // Generate a fallback ad ID if none was found
        const adId = card.adId || `google-${advertiserId || 'unknown'}-${index}`;
        
        return {
          brand: brandName,
          headline: card.headline || null,
          body: card.body || null,
          imageUrl: card.imageUrl || null,
          thumbnailUrl: card.imageUrl || null, // Use same image for thumbnail
          cta: card.cta || null,
          adId: adId,
          platformDetails: card.platformDetails || null,
          lastSeen: card.lastSeen || null,
          advertiserId: advertiserId || adId.split('-')[1] // Fallback
        };
      });
    
    console.log(`Found ${extractedAds.length} ads for advertiser: ${searchQuery}`);
    return extractedAds;
    
  } catch (error) {
    console.error(`Error scraping Google Ads for advertiser: ${searchQuery}`, error);
    throw new Error(`Failed to scrape Google Ads Transparency Center: ${(error as Error).message}`);
  }
}

/**
 * Transform Google ad data into our standard Competitor Ad format
 */
export function transformGoogleAds(googleAds: GoogleAdData[], userId?: number, industry?: string): InsertCompetitorAd[] {
  return googleAds.map(ad => {
    // Create the transformed competitor ad
    const competitorAd: InsertCompetitorAd = {
      platform: 'Google',
      brand: ad.brand,
      headline: ad.headline || null,
      body: ad.body || null,
      image_url: ad.imageUrl || null,
      thumbnail_url: ad.thumbnailUrl || null,
      cta: ad.cta || null,
      start_date: null, // Google doesn't provide exact start dates
      platform_details: ad.platformDetails || null,
      ad_id: ad.adId || '',
      page_id: ad.advertiserId || '',
      snapshot_url: '', // Google doesn't provide snapshot URLs
      fetched_by_user_id: userId || null,
      industry: industry || null,
      tags: [], // No tags by default
      is_active: true,
      style_description: null, // We'll generate this separately using AI
      metadata: {
        lastSeen: ad.lastSeen,
        raw_google_data: ad // Store the original data for reference
      }
    };
    
    return competitorAd;
  });
}

/**
 * Save fetched Google ads to the database
 */
export async function saveGoogleAds(googleAds: GoogleAdData[], userId?: number, industry?: string): Promise<CompetitorAd[]> {
  const transformedAds = transformGoogleAds(googleAds, userId, industry);
  
  if (transformedAds.length === 0) {
    return [];
  }
  
  try {
    console.log(`Saving ${transformedAds.length} Google ads to database`);
    
    // Insert all ads and return the inserted records
    const savedAds = await db.insert(competitorAds).values(transformedAds).returning();
    
    console.log(`Successfully saved ${savedAds.length} Google ads to database`);
    return savedAds;
  } catch (error) {
    console.error('Error saving Google ads to database:', error);
    throw new Error(`Failed to save Google ads to database: ${(error as Error).message}`);
  }
}

/**
 * Find relevant advertisers for a given industry or keyword
 * Using a mapping between industries and known advertisers with their Google Ad IDs
 */
export function findRelevantAdvertisers(query: string): string[] {
  // Viele der größeren Marken haben bekannte IDs in Google's Ads Transparency Center
  // Format: brand name: AR... ID
  const knownAdvertiserIds: Record<string, string> = {
    'nike': 'AR488803513102942208',
    'adidas': 'AR09364018780667904',
    'apple': 'AR467122456588591104',
    'microsoft': 'AR516879332667596800',
    'google': 'AR18054737239162880',
    'amazon': 'AR579308875399675904',
    'samsung': 'AR525636455835475968',
    'coca-cola': 'AR411337481615515648',
    'pepsi': 'AR547005209329508352',
    'mcdonalds': 'AR586780018707562496',
    'starbucks': 'AR01985402131456000',
    'walmart': 'AR476351957455847424',
    'target': 'AR440233347195789312',
    'dell': 'AR440214727474380800',
    'hp': 'AR429055584834387968',
    'ford': 'AR528764493613039616',
    'toyota': 'AR511433172284063744',
    'bmw': 'AR429158019538296832',
    'audi': 'AR18177481359892480',
    'netflix': 'AR492246968245166080',
    'disney': 'AR419608580587913216',
    'hbo': 'AR411378493474922496'
  };
  
  // Industry-to-brand mapping for keywords und Branchen
  const industryAdvertisers: Record<string, string[]> = {
    'fitness': ['nike', 'adidas', 'under armour', 'peloton', 'planet fitness'],
    'tech': ['apple', 'microsoft', 'samsung', 'google', 'dell'],
    'food': ['mcdonalds', 'kraft heinz', 'kellogg', 'nestle', 'pepsi'],
    'beauty': ['sephora', 'maybelline', 'loreal', 'fenty beauty', 'estee lauder'],
    'fashion': ['zara', 'h&m', 'uniqlo', 'gap', 'ralph lauren'],
    'automotive': ['toyota', 'ford', 'tesla', 'bmw', 'audi'],
    'travel': ['expedia', 'airbnb', 'booking.com', 'trip.com', 'marriott'],
    'finance': ['chase', 'bank of america', 'wells fargo', 'citibank', 'capital one'],
    'streaming': ['netflix', 'disney', 'hulu', 'hbo', 'amazon'],
    'ecommerce': ['amazon', 'walmart', 'target', 'ebay', 'etsy']
  };
  
  // Normalize query
  const normalizedQuery = query.trim().toLowerCase();
  
  // Direct match with known advertiser ID
  if (normalizedQuery in knownAdvertiserIds) {
    console.log(`Found known advertiser ID for ${normalizedQuery}: ${knownAdvertiserIds[normalizedQuery]}`);
    return [knownAdvertiserIds[normalizedQuery]];
  }
  
  // Check if query exactly matches an industry
  if (normalizedQuery in industryAdvertisers) {
    // For industries, return advertisers with IDs when available
    return industryAdvertisers[normalizedQuery].map(brand => 
      knownAdvertiserIds[brand] || brand
    );
  }
  
  // Check if query contains any industry keywords
  for (const [industry, brands] of Object.entries(industryAdvertisers)) {
    if (normalizedQuery.includes(industry)) {
      // Return known brands from this industry with IDs when available
      return brands.map(brand => knownAdvertiserIds[brand] || brand);
    }
  }
  
  // If it's likely a brand name, just return it
  if (!normalizedQuery.includes(' ') && normalizedQuery.length > 2) {
    // If we have the ID, use it
    const knownBrands = Object.keys(knownAdvertiserIds);
    for (const brand of knownBrands) {
      if (brand.includes(normalizedQuery) || normalizedQuery.includes(brand)) {
        console.log(`Found partial match for "${normalizedQuery}" with brand "${brand}"`);
        return [knownAdvertiserIds[brand]];
      }
    }
    return [query]; // Assume it's a brand name
  }
  
  // Default: return a few popular advertisers with known IDs
  return [
    knownAdvertiserIds['nike'] || 'nike',
    knownAdvertiserIds['apple'] || 'apple', 
    knownAdvertiserIds['coca-cola'] || 'coca-cola',
    knownAdvertiserIds['amazon'] || 'amazon', 
    knownAdvertiserIds['starbucks'] || 'starbucks'
  ];
}



/**
 * Search for ads in Google's Ads Transparency Center
 * Using Firecrawl instead of Puppeteer
 */
export async function searchGoogleAds(query: string, options: {
  queryType?: 'brand' | 'keyword' | 'industry';
  userId?: number;
  maxAds?: number;
  region?: string;
}): Promise<CompetitorAd[]> {
  try {
    let advertisers: string[] = [];
    
    if (options.queryType === 'brand') {
      // For brand searches: First check if we have an ID for this brand
      const normalizedBrand = query.trim().toLowerCase();
      const knownAdvertiserIds: Record<string, string> = {
        'nike': 'AR488803513102942208',
        'adidas': 'AR09364018780667904',
        'apple': 'AR467122456588591104',
        'microsoft': 'AR516879332667596800',
        'google': 'AR18054737239162880',
        'amazon': 'AR579308875399675904',
        'samsung': 'AR525636455835475968',
        'coca-cola': 'AR411337481615515648',
        'pepsi': 'AR547005209329508352',
        'mcdonalds': 'AR586780018707562496',
        'starbucks': 'AR01985402131456000'
      };
      
      // If it's a known brand, use the ID
      if (normalizedBrand in knownAdvertiserIds) {
        advertisers = [knownAdvertiserIds[normalizedBrand]];
        console.log(`Using known advertiser ID for brand ${normalizedBrand}: ${knownAdvertiserIds[normalizedBrand]}`);
      } else {
        // Otherwise use the brand name directly
        advertisers = [query];
      }
    } else {
      // For keyword/industry queries, find relevant advertisers
      advertisers = findRelevantAdvertisers(query);
    }
    
    console.log(`Searching Google Ads for ${advertisers.length} advertisers related to: ${query}`);
    
    // Limit the number of advertisers to search to avoid long processing times
    const limitedAdvertisers = advertisers.slice(0, 3);
    
    // Create an array to store all ads
    const allAds: CompetitorAd[] = [];
    
    // Search for each advertiser
    for (const advertiser of limitedAdvertisers) {
      try {
        // Scrape ads for this advertiser using Firecrawl
        const googleAds = await scrapeGoogleAdsForAdvertiser(advertiser, {
          searchType: advertiser.startsWith('AR') ? 'brand' : options.queryType,
          region: options.region,
          maxAds: options.maxAds || 10
        });
        
        // Save the ads to the database
        const savedAds = await saveGoogleAds(
          googleAds, 
          options.userId,
          options.queryType === 'industry' ? query : undefined
        );
        
        // Add the saved ads to our result array
        allAds.push(...savedAds);
        
      } catch (error) {
        console.error(`Error fetching ads for advertiser "${advertiser}":`, error);
        // Continue with the next advertiser
      }
    }
    
    return allAds;
  } catch (error) {
    console.error(`Error searching Google ads for "${query}":`, error);
    throw error;
  }
}