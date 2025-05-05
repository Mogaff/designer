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
  headline?: string;
  body?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  cta?: string;
  adId?: string;
  platformDetails?: string; // YouTube, Search, Display, etc.
  lastSeen?: string;
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
): Promise<GoogleAdData[]> {
  const region = options.region || 'US';
  const maxAds = options.maxAds || 20;
  const timeout = options.timeout || 30000; // 30 seconds
  
  console.log(`Scraping Google Ads for advertiser: ${advertiser} in region: ${region}`);
  
  // Launch a headless browser with correct executable path
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/zpmy9jdxaz3fcv1ziw7p7xk7siydnap3-chromium-112.0.5615.165/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a reasonable timeout
    page.setDefaultTimeout(timeout);
    
    // Navigate to the Ads Transparency Center with the region parameter
    await page.goto(`${GOOGLE_ADS_TRANSPARENCY_URL}?region=${region}`);
    
    // Wait for the search box to be available
    await page.waitForSelector('input[aria-label="Search by advertiser or website name"]');
    
    // Type the advertiser name into the search box
    await page.type('input[aria-label="Search by advertiser or website name"]', advertiser);
    
    // Press Enter to search
    await page.keyboard.press('Enter');
    
    // Wait for search results
    try {
      await page.waitForSelector('[role="listitem"]', { timeout: 10000 });
    } catch (error) {
      console.log(`No search results found for advertiser: ${advertiser}`);
      return [];
    }
    
    // Click on the first matching advertiser
    await page.evaluate(() => {
      const items = document.querySelectorAll('[role="listitem"]');
      if (items.length > 0) {
        (items[0] as HTMLElement).click();
      }
    });
    
    // Wait for ads to load
    try {
      await page.waitForSelector('.ad-card', { timeout: 10000 });
    } catch (error) {
      console.log(`No ads found for advertiser: ${advertiser}`);
      return [];
    }
    
    // Extract the advertiser ID from the URL
    const url = page.url();
    const advertiserId = url.match(/advertiser\/(AR[0-9]+)/)?.[1];
    
    // Extract ad data from the page
    const ads = await page.evaluate((maxAdsToExtract, advertiserId) => {
      const adCards = document.querySelectorAll('.ad-card');
      const extractedAds: GoogleAdData[] = [];
      
      for (let i = 0; i < Math.min(adCards.length, maxAdsToExtract); i++) {
        const card = adCards[i];
        
        // Extract headline
        const headline = card.querySelector('.ad-title')?.textContent?.trim();
        
        // Extract body text
        const body = card.querySelector('.ad-description')?.textContent?.trim();
        
        // Extract image URL if available
        const image = card.querySelector('img');
        const imageUrl = image?.src;
        
        // Extract platform details (YouTube, Search, etc.)
        const platformBadge = card.querySelector('.ad-platform-badge');
        const platform = platformBadge?.textContent?.trim();
        
        // Extract last seen date if available
        const lastSeen = card.querySelector('.ad-last-seen')?.textContent?.trim();
        
        // Extract CTA text if available
        const cta = card.querySelector('.ad-cta')?.textContent?.trim();
        
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
 * Generate a placeholder ad that resembles a real Google ad
 * Used when the Google Ads Transparency Center cannot be scraped
 */
export function createPlaceholderGoogleAd(brand: string, industry?: string): GoogleAdData {
  // Generate a random ad ID
  const randomAdId = `google-${brand.toLowerCase().replace(/\s+/g, '-')}-${Math.floor(Math.random() * 1000000)}`;
  
  // Templates for different industries
  const templates: {[key: string]: {headline: string, body: string, cta: string, platform: string}} = {
    'fitness': {
      headline: `${brand} Fitness Equipment`,
      body: `Discover premium fitness equipment from ${brand}. Designed for all levels of fitness enthusiasts.`,
      cta: 'Shop Now',
      platform: 'YouTube'
    },
    'tech': {
      headline: `${brand} - Technology That Works`,
      body: `Explore the latest tech innovations from ${brand}. Powerful, reliable, and user-friendly.`,
      cta: 'Learn More',
      platform: 'Google Search'
    },
    'food': {
      headline: `${brand} - Delicious Options`,
      body: `Try ${brand}'s new menu items. Fresh ingredients, amazing taste, delivered to your door.`,
      cta: 'Order Online',
      platform: 'Display Network'
    },
    'fashion': {
      headline: `${brand} - New Season Collection`,
      body: `Shop the latest fashion trends from ${brand}. Express yourself with our exclusive designs.`,
      cta: 'View Collection',
      platform: 'YouTube'
    },
    'default': {
      headline: `${brand} - Official Ad`,
      body: `Learn more about ${brand} products and services. Quality you can trust.`,
      cta: 'Visit Website',
      platform: 'Google Search'
    }
  };
  
  // Select the appropriate template
  const template = templates[industry || ''] || templates['default'];
  
  // Create the placeholder ad
  return {
    brand: brand,
    headline: template.headline,
    body: template.body,
    cta: template.cta,
    imageUrl: `https://placehold.co/600x400/png?text=${encodeURIComponent(brand)}`,
    thumbnailUrl: `https://placehold.co/300x200/png?text=${encodeURIComponent(brand)}`,
    adId: randomAdId,
    platformDetails: template.platform,
    lastSeen: new Date().toISOString().split('T')[0],
    advertiserId: brand.toLowerCase().replace(/\s+/g, '-')
  };
}

/**
 * Generate sample ads when the Google Ads Transparency Center cannot be scraped
 */
export async function getPlaceholderAds(query: string, queryType: 'brand' | 'keyword' | 'industry', limit: number = 3): Promise<CompetitorAd[]> {
  let brands: string[] = [];
  let industry: string | undefined = undefined;
  
  if (queryType === 'brand') {
    // Use the query directly as the brand
    brands = [query];
  } else if (queryType === 'industry') {
    // Set the industry and use related brands
    industry = query;
    switch (query.toLowerCase()) {
      case 'fitness':
        brands = ['Nike', 'Adidas', 'Under Armour'];
        break;
      case 'tech':
        brands = ['Apple', 'Samsung', 'Microsoft'];
        break;
      case 'food':
        brands = ['McDonalds', 'Burger King', 'Starbucks'];
        break;
      case 'fashion':
        brands = ['H&M', 'Zara', 'Gucci'];
        break;
      default:
        brands = ['Major Brand', 'Popular Company', 'Industry Leader'];
    }
  } else {
    // For keywords, try to make related brands
    if (query.toLowerCase().includes('shoe') || query.toLowerCase().includes('sport')) {
      brands = ['Nike', 'Adidas', 'New Balance'];
      industry = 'fitness';
    } else if (query.toLowerCase().includes('phone') || query.toLowerCase().includes('tech')) {
      brands = ['Apple', 'Samsung', 'Google'];
      industry = 'tech';
    } else if (query.toLowerCase().includes('food') || query.toLowerCase().includes('coffee')) {
      brands = ['Starbucks', 'McDonalds', 'Dunkin'];
      industry = 'food';
    } else {
      brands = ['Top Brand', 'Leading Company', 'Major Provider'];
    }
  }
  
  // Generate placeholder Google ads
  const googleAdsData = brands.slice(0, limit).map(brand => 
    createPlaceholderGoogleAd(brand, industry)
  );
  
  // Transform to our standard format and save
  const transformedAds = transformGoogleAds(googleAdsData);
  
  // Return placeholder ads in our standard format
  return transformedAds.map(ad => ({
    ...ad,
    id: Math.floor(Math.random() * 1000000),
    created_at: new Date(),
    updated_at: new Date()
  }));
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