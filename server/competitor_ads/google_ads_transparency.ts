/**
 * Google Ads Transparency Center Scraper
 * Handles fetching competitor ads from Google's Ads Transparency Center
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
 */
export async function scrapeGoogleAdsForAdvertiser(
  searchQuery: string,
  options: ScrapingOptions & {
    searchType?: 'brand' | 'keyword' | 'industry';
  } = {}
): Promise<any[]> {
  const region = options.region || 'US';
  const maxAds = options.maxAds || 20;
  const timeout = options.timeout || 30000; // 30 seconds
  
  console.log(`Scraping Google Ads for advertiser: ${searchQuery} in region: ${region}`);
  
  // Launch a headless browser with optimized configuration for Replit
  const browser = await puppeteer.launch({
    headless: true, // Use headless mode
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-web-security',
      '--disable-features=site-per-process',
      '--disable-site-isolation-trials',
      '--window-size=1920,1080', // Use larger window size for better rendering
      '--mute-audio', // No audio needed
      '--ignore-certificate-errors', // Ignore SSL errors
      '--disable-notifications' // Disable notifications
    ],
    timeout: 60000, // 60 seconds
    defaultViewport: { width: 1920, height: 1080 } // Larger viewport to see more content
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a reasonable timeout
    page.setDefaultTimeout(timeout);
    
    // Dieser Teil wird übersprungen, da wir direkt zur Anzeigenseite gehen
    
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
    
    const advertiserPageUrl = searchUrl;
    console.log(`Navigating to advertiser page: ${advertiserPageUrl}`);
    
    try {
      // Set user agent to appear more like a regular browser
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      
      // Set extra HTTP headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
        'sec-ch-ua': '"Google Chrome";v="125", " Not A;Brand";v="99", "Chromium";v="125"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"'
      });
      
      console.log(`Navigating to ${advertiserPageUrl} with improved browser profile`);
      await page.goto(advertiserPageUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait longer for the page to fully render
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Log the current URL to help with debugging
      console.log(`Current page URL: ${page.url()}`);
      
      // Take a screenshot for debugging (disabled in production)
      // await page.screenshot({ path: './temp/google-ads-page.png' });
      
      // Prüfen, ob Anzeigen geladen wurden - verschiedene CSS-Selektoren versuchen
      const hasAds = await page.evaluate(() => {
        // Google ändert manchmal ihre Klassennamen, daher versuchen wir mehrere Selektoren
        const possibleSelectors = [
          '.ad-card', 
          '.adCard', 
          '.ad-container', 
          '.adContainer',
          '[data-ad-id]',
          '[data-testid="ad-card"]',
          '.gtc-ad-card',
          '.ad_card'
        ];
        
        for (const selector of possibleSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements && elements.length > 0) {
            console.log(`Found ads using selector: ${selector} (count: ${elements.length})`);
            return true;
          }
        }
        
        return false;
      });
      
      if (!hasAds) {
        console.log(`No ads found for advertiser: ${searchQuery}`);
        return [];
      }
    } catch (error) {
      console.log(`Error navigating to advertiser page: ${error}`);
      return [];
    }
    
    // Extract the advertiser ID from the URL
    const url = page.url();
    const advertiserId = url.match(/advertiser\/(AR[0-9]+)/)?.[1];
    
    // Extract ad data from the page with robuste Selektoren
    const ads = await page.evaluate((maxAdsToExtract, advertiserId) => {
      // Alle möglichen Selektoren für Anzeigen
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
      
      // Finde den ersten Selektor, der Ergebnisse liefert
      let adCards = [];
      let usedSelector = '';
      
      for (const selector of adCardSelectors) {
        const elements = Array.from(document.querySelectorAll(selector));
        if (elements.length > 0) {
          adCards = elements;
          usedSelector = selector;
          console.log(`Using selector "${selector}" for ad cards. Found ${elements.length} ads.`);
          break;
        }
      }
      
      const extractedAds = [];
      
      // Helper-Funktion, um Text mit verschiedenen Selektoren zu extrahieren
      const extractText = (element, selectors) => {
        for (const selector of selectors) {
          const el = element.querySelector(selector);
          if (el && el.textContent) {
            return el.textContent.trim();
          }
        }
        return null;
      };
      
      // Helper-Funktion für Bilder
      const extractImage = (element, selectors) => {
        for (const selector of selectors) {
          const el = element.querySelector(selector);
          if (el && el.src) {
            return el.src;
          }
        }
        return null;
      };
      
      for (let i = 0; i < Math.min(adCards.length, maxAdsToExtract); i++) {
        const card = adCards[i];
        
        // Extract headline mit verschiedenen möglichen Selektoren
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
        
        // Extract image URL if available
        const imageUrl = extractImage(card, ['img', '[data-testid="ad-image"]']);
        
        // Extract platform details (YouTube, Search, etc.)
        const platform = extractText(card, [
          '.ad-platform-badge', 
          '.adPlatform', 
          '.platform-badge',
          '[data-testid="ad-platform"]'
        ]);
        
        // Extract last seen date if available
        const lastSeen = extractText(card, [
          '.ad-last-seen', 
          '.adLastSeen', 
          '.last-seen',
          '[data-testid="ad-last-seen"]'
        ]);
        
        // Extract CTA text if available
        const cta = extractText(card, [
          '.ad-cta', 
          '.adCta', 
          '.call-to-action',
          '[data-testid="ad-cta"]',
          'button'
        ]);
        
        // Generate a unique ad ID
        let adId = `google-${advertiserId}-${i}`;
        
        // Versuche, eine eindeutige ID zu finden
        const dataAttrNames = Array.from(card.attributes)
          .filter(attr => attr.name.startsWith('data-'))
          .map(attr => attr.name);
          
        for (const attrName of dataAttrNames) {
          if (attrName.includes('id')) {
            const value = card.getAttribute(attrName);
            if (value) {
              adId = value;
              break;
            }
          }
        }
        
        // Versuch, den Markennamen zu extrahieren (verschiedene Selektoren)
        const brandSelectors = [
          '.advertiser-name', 
          '.advertiserName', 
          '[data-testid="advertiser-name"]',
          '.brand-name',
          '.company-name',
          'h1'
        ];
        
        let brand = 'Unknown';
        for (const selector of brandSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent) {
            brand = el.textContent.trim();
            break;
          }
        }
        
        extractedAds.push({
          brand,
          headline,
          body,
          imageUrl,
          thumbnailUrl: imageUrl, // Use same image for thumbnail
          cta,
          adId,
          platformDetails: platform,
          lastSeen,
          advertiserId: advertiserId || adId.split('-')[1] // Fallback
        });
      }
      
      return extractedAds;
    }, maxAds, advertiserId);
    
    console.log(`Found ${ads.length} ads for advertiser: ${searchQuery}`);
    return ads;
    
  } catch (error) {
    console.error(`Error scraping Google Ads for advertiser: ${searchQuery}`, error);
    throw new Error(`Failed to scrape Google Ads Transparency Center: ${(error as Error).message}`);
  } finally {
    await browser.close();
  }
}

/**
 * Transform Google ad data into our standard Competitor Ad format
 */
export function transformGoogleAds(googleAds: any[], userId?: number, industry?: string): InsertCompetitorAd[] {
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
      // Für Marken-Suchen: Zuerst prüfen, ob wir eine ID für diese Marke haben
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
      
      // Wenn es eine bekannte Marke ist, verwenden wir die ID
      if (normalizedBrand in knownAdvertiserIds) {
        advertisers = [knownAdvertiserIds[normalizedBrand]];
        console.log(`Using known advertiser ID for brand ${normalizedBrand}: ${knownAdvertiserIds[normalizedBrand]}`);
      } else {
        // Sonst den Markennamen verwenden
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
        // Scrape ads for this advertiser
        const googleAds = await scrapeGoogleAdsForAdvertiser(advertiser, {
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