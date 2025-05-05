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
  advertiser: string,
  options: ScrapingOptions = {}
): Promise<any[]> {
  const region = options.region || 'US';
  const maxAds = options.maxAds || 20;
  const timeout = options.timeout || 30000; // 30 seconds
  
  console.log(`Scraping Google Ads for advertiser: ${advertiser} in region: ${region}`);
  
  // Launch a headless browser
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // Reduziert den Speicherverbrauch
      '--disable-gpu',
      '--disable-extensions',
      '--disable-web-security',
      '--disable-features=site-per-process',
      '--disable-site-isolation-trials'
    ],
    timeout: 60000 // 60 Sekunden
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a reasonable timeout
    page.setDefaultTimeout(timeout);
    
    // Dieser Teil wird übersprungen, da wir direkt zur Anzeigenseite gehen
    
    // Direkt auf die Anzeigen-Seite des Werbetreibenden navigieren
    const advertiserPageUrl = `${GOOGLE_ADS_TRANSPARENCY_URL}/advertiser/${encodeURIComponent(advertiser)}?region=${region}`;
    console.log(`Navigating to advertiser page: ${advertiserPageUrl}`);
    
    try {
      await page.goto(advertiserPageUrl, { waitUntil: 'networkidle2' });
      // Kurz warten, damit die Seite vollständig laden kann
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Prüfen, ob Anzeigen geladen wurden
      const hasAds = await page.evaluate(() => {
        return document.querySelectorAll('.ad-card').length > 0;
      });
      
      if (!hasAds) {
        console.log(`No ads found for advertiser: ${advertiser}`);
        return [];
      }
    } catch (error) {
      console.log(`Error navigating to advertiser page: ${error}`);
      return [];
    }
    
    // Extract the advertiser ID from the URL
    const url = page.url();
    const advertiserId = url.match(/advertiser\/(AR[0-9]+)/)?.[1];
    
    // Extract ad data from the page
    const ads = await page.evaluate((maxAdsToExtract, advertiserId) => {
      const adCards = document.querySelectorAll('.ad-card');
      const extractedAds = [];
      
      for (let i = 0; i < Math.min(adCards.length, maxAdsToExtract); i++) {
        const card = adCards[i];
        
        // Extract headline
        const headline = card.querySelector('.ad-title')?.textContent?.trim() || null;
        
        // Extract body text
        const body = card.querySelector('.ad-description')?.textContent?.trim() || null;
        
        // Extract image URL if available
        const image = card.querySelector('img');
        const imageUrl = image?.src || null;
        
        // Extract platform details (YouTube, Search, etc.)
        const platformBadge = card.querySelector('.ad-platform-badge');
        const platform = platformBadge?.textContent?.trim() || null;
        
        // Extract last seen date if available
        const lastSeen = card.querySelector('.ad-last-seen')?.textContent?.trim() || null;
        
        // Extract CTA text if available
        const cta = card.querySelector('.ad-cta')?.textContent?.trim() || null;
        
        // Generate a unique ad ID since Google doesn't provide one
        const adIdElement = card.querySelector('[data-ad-id]');
        const adId = adIdElement ? adIdElement.getAttribute('data-ad-id') : 
                    `google-${advertiserId}-${i}`;
        
        extractedAds.push({
          brand: document.querySelector('.advertiser-name')?.textContent?.trim() || 'Unknown',
          headline,
          body,
          imageUrl,
          thumbnailUrl: imageUrl, // Use same image for thumbnail
          cta,
          adId,
          platformDetails: platform,
          lastSeen,
          advertiserId
        });
      }
      
      return extractedAds;
    }, maxAds, advertiserId);
    
    console.log(`Found ${ads.length} ads for advertiser: ${advertiser}`);
    return ads;
    
  } catch (error) {
    console.error(`Error scraping Google Ads for advertiser: ${advertiser}`, error);
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
 * Using a simple mapping between industries and known advertisers
 */
export function findRelevantAdvertisers(query: string): string[] {
  // Basic industry-to-advertiser mapping
  const industryAdvertisers: Record<string, string[]> = {
    'fitness': ['Nike', 'Adidas', 'Under Armour', 'Peloton', 'Planet Fitness'],
    'tech': ['Apple', 'Microsoft', 'Samsung', 'Google', 'Dell'],
    'food': ['McDonalds', 'Kraft Heinz', 'Kellogg', 'Nestle', 'PepsiCo'],
    'beauty': ['Sephora', 'Maybelline', 'LOreal', 'Fenty Beauty', 'Estee Lauder'],
    'fashion': ['Zara', 'H&M', 'Uniqlo', 'GAP', 'Ralph Lauren'],
    'automotive': ['Toyota', 'Ford', 'Tesla', 'BMW', 'Honda'],
    'travel': ['Expedia', 'Airbnb', 'Booking.com', 'Trip.com', 'Marriott'],
    'finance': ['Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'Capital One'],
    'streaming': ['Netflix', 'Disney+', 'Hulu', 'HBO Max', 'Amazon Prime Video'],
    'ecommerce': ['Amazon', 'Walmart', 'Target', 'eBay', 'Etsy']
  };
  
  // Normalize query
  const normalizedQuery = query.trim().toLowerCase();
  
  // Check if the query exactly matches an industry
  if (normalizedQuery in industryAdvertisers) {
    return industryAdvertisers[normalizedQuery];
  }
  
  // Check if query contains any industry keywords
  for (const [industry, _] of Object.entries(industryAdvertisers)) {
    if (normalizedQuery.includes(industry)) {
      return industryAdvertisers[industry];
    }
  }
  
  // If it's likely a brand name, just return it
  if (!normalizedQuery.includes(' ') && normalizedQuery.length > 2) {
    return [query]; // Assume it's a brand name
  }
  
  // Default: return a few popular advertisers
  return ['Nike', 'Apple', 'Coca-Cola', 'Amazon', 'Starbucks'];
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
      // For brand queries, use the query directly
      advertisers = [query];
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