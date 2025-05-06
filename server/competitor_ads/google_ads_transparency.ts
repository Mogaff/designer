/**
 * Google Ads Transparency Center Scraper
 * Handles fetching competitor ads from Google's Ads Transparency Center
 */

import puppeteer from 'puppeteer-core';
import { CompetitorAd, InsertCompetitorAd } from '@shared/schema';
import { db } from '../db';
import { competitorAds } from '@shared/schema';
import fs from 'fs';

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
  searchType?: 'brand' | 'keyword' | 'industry';
}

/**
 * Scrape ads for a specific advertiser from Google's Ads Transparency Center
 */
export async function scrapeGoogleAdsForAdvertiser(
  searchQuery: string,
  options: ScrapingOptions = {}
): Promise<any[]> {
  const region = options.region || 'US';
  const maxAds = options.maxAds || 10; // Reduced from 20 to 10 for faster processing
  const timeout = options.timeout || 30000; // 30 seconds
  
  console.log(`[GoogleAdsScraper] Starting scrape for: ${searchQuery} in region: ${region}`);
  
  // Check if searchQuery is empty or invalid
  if (!searchQuery || searchQuery.trim() === '') {
    console.error('[GoogleAdsScraper] Invalid empty search query');
    return [];
  }
  
  // Launch a browser with better configuration to avoid detection
  let browser = null;
  try {
    console.log('[GoogleAdsScraper] Launching browser with Chromium path: /nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium');
    
    // Use non-headless mode for better success (though with headless=false on Replit, it still works "headlessly")
    // This helps to evade some bot detection systems
    browser = await puppeteer.launch({
      headless: false, // Non-headless mode often has higher success rate against bot detection
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled', // Hide automation flags
        '--window-size=1920,1080',
        '--start-maximized',
        '--disable-notifications',
        '--lang=en-US,en',
        // Improved font rendering to look more like a real browser
        '--font-render-hinting=medium',
        // Add realistic browser flags
        '--use-gl=egl',
        '--disable-infobars',
        '--disable-features=IsolateOrigins,site-per-process',
        // Additional evasion flags
        '--disable-extensions-except=',
        '--user-agent-client-hint',
        '--accept-lang=en-US,en;q=0.9',
        // Needed for Replit's environment
        '--no-zygote',
        '--single-process' // More stable in limited environments
      ],
      timeout: options.timeout || 60000,
      defaultViewport: null, // Let the browser control viewport - more natural
    });
    
    console.log('[GoogleAdsScraper] Browser launched successfully with evasion configuration');
  } catch (error) {
    console.error('[GoogleAdsScraper] Failed to launch browser:', error);
    return [];
  }
  
  try {
    const page = await browser.newPage();
    
    // Set a reasonable timeout
    page.setDefaultTimeout(timeout);
    
    // Set user agent to a real browser profile
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    
    // Set language and geolocation preferences
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'sec-ch-ua': '"Google Chrome";v="125", " Not;A Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    });
    
    // Set cookies to appear more like a regular user
    await page.setCookie({
      name: 'CONSENT',
      value: 'YES+',
      domain: '.google.com',
      path: '/',
    });
    
    // Handle different search types
    let searchUrl = '';
    const searchRegion = options.region || 'US';
    
    if (options.searchType === 'brand') {
      // For brand searches, try direct advertiser URL
      // Check if it's an AR ID first
      if (searchQuery.startsWith('AR')) {
        searchUrl = `${GOOGLE_ADS_TRANSPARENCY_URL}/advertiser/${encodeURIComponent(searchQuery)}?region=${searchRegion}`;
        console.log(`[GoogleAdsScraper] Using direct AR ID URL: ${searchUrl}`);
      } else {
        // For brands without AR ID, use search instead for better results
        searchUrl = `${GOOGLE_ADS_TRANSPARENCY_URL}/search?q=${encodeURIComponent(searchQuery)}&region=${searchRegion}`;
        console.log(`[GoogleAdsScraper] Using search URL for brand: ${searchUrl}`);
      }
    } else {
      // For keyword and industry searches, use the search endpoint
      searchUrl = `${GOOGLE_ADS_TRANSPARENCY_URL}/search?q=${encodeURIComponent(searchQuery)}&region=${searchRegion}`;
      console.log(`[GoogleAdsScraper] Using search URL: ${searchUrl}`);
    }
    
    const advertiserPageUrl = searchUrl;
    console.log(`[GoogleAdsScraper] Navigating to page: ${advertiserPageUrl}`);
    
    try {
      // Advanced anti-detection setup
      await page.evaluateOnNewDocument(() => {
        // Overwrite the navigator properties to evade fingerprinting
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
        
        // Overwrite the plugins array with fake data
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            {
              0: {
                type: "application/pdf",
                suffixes: "pdf",
                description: "Portable Document Format",
                enabledPlugin: true,
              },
              name: "Chrome PDF Plugin",
              filename: "internal-pdf-viewer",
              description: "Portable Document Format",
              length: 1,
            },
            {
              0: {
                type: "application/pdf",
                suffixes: "pdf",
                description: "Portable Document Format",
                enabledPlugin: true,
              },
              name: "Chrome PDF Viewer",
              filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
              description: "Portable Document Format",
              length: 1,
            },
            {
              0: {
                type: "application/x-nacl",
                suffixes: "",
                description: "Native Client Executable",
                enabledPlugin: true,
              },
              name: "Native Client",
              filename: "internal-nacl-plugin",
              description: "Native Client Executable",
              length: 1,
            }
          ],
        });
        
        // Modify languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en', 'de'],
        });
        
        // Prevent detection via Chrome (Blink) rendering engine
        // @ts-ignore - Chrome property doesn't exist in TypeScript definitions
        window.chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {},
        };
        
        // Create a fake notification permission
        const originalQuery = window.Notification?.requestPermission;
        if (window.Notification) {
          window.Notification.requestPermission = function () {
            return Promise.resolve('granted');
          };
        }
        
        // Hide automation flags (using any to avoid TypeScript errors)
        const win = window as any;
        if (win.cdc_adoQpoasnfa76pfcZLmcfl_Array) delete win.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        if (win.cdc_adoQpoasnfa76pfcZLmcfl_Promise) delete win.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        if (win.cdc_adoQpoasnfa76pfcZLmcfl_Symbol) delete win.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
      });
      
      // Use a believable user agent
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.95 Mobile/15E148 Safari/604.1'
      ];
      
      // Choose a random user agent
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      await page.setUserAgent(randomUserAgent);
      console.log(`[GoogleAdsScraper] Using user agent: ${randomUserAgent}`);
      
      // Set realistic HTTP headers for a browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Ch-Ua': '"Google Chrome";v="125", " Not A;Brand";v="99", "Chromium";v="125"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Upgrade-Insecure-Requests': '1',
        'DNT': '1'
      });
      
      console.log(`[GoogleAdsScraper] Enhanced browser fingerprint to avoid detection`);
      console.log(`[GoogleAdsScraper] Navigating to ${advertiserPageUrl}`);
      
      // First, visit Google homepage to establish a more natural browsing pattern
      try {
        await page.goto('https://www.google.com', { 
          waitUntil: 'networkidle2',
          timeout: 15000 
        });
        
        // Wait a random amount of time to simulate human browsing
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
        
        console.log('[GoogleAdsScraper] Successfully visited Google homepage as initial step');
      } catch (error) {
        console.log(`[GoogleAdsScraper] Initial Google homepage visit failed: ${error}`);
        // Continue anyway
      }
      
      // Now navigate to the actual target URL with improved error handling
      try {
        await page.goto(advertiserPageUrl, { 
          waitUntil: 'networkidle2',
          timeout: 35000 
        });
        
        console.log(`[GoogleAdsScraper] Successfully loaded page with networkidle2 strategy`);
      } catch (error) {
        console.log(`[GoogleAdsScraper] Primary navigation attempt failed: ${error}`);
        
        // Try with domcontentloaded as fallback
        try {
          await page.goto(advertiserPageUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 25000 
          });
          console.log(`[GoogleAdsScraper] Loaded with domcontentloaded strategy`);
          
          // Simulate scrolling to trigger lazy loading content with more human-like behavior
          await page.evaluate(() => {
            return new Promise((resolve) => {
              // Initial delay
              setTimeout(() => {
                window.scrollBy(0, 200 + Math.random() * 100);
                
                // Second scroll
                setTimeout(() => {
                  window.scrollBy(0, 250 + Math.random() * 150);
                  
                  // Third scroll
                  setTimeout(() => {
                    window.scrollBy(0, 300 + Math.random() * 200);
                    
                    // Pause
                    setTimeout(() => {
                      // Scroll back up a bit (like a human looking for something)
                      window.scrollBy(0, -150);
                      
                      // Then continue scrolling down
                      setTimeout(() => {
                        window.scrollBy(0, 400);
                        
                        // Then back to top slowly
                        setTimeout(() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          resolve(true);
                        }, 1200);
                      }, 800);
                    }, 1000);
                  }, 800);
                }, 700);
              }, 500);
            });
          });
          
          // Handle clicks on "See more ads" button if present
          try {
            const buttonVisible = await page.evaluate(() => {
              const seeMoreButton = Array.from(document.querySelectorAll('button, a')).find(el => {
                const text = el.textContent?.trim().toLowerCase() || '';
                return text.includes('see more') || 
                       text.includes('load more') || 
                       text.includes('show more') ||
                       text.includes('view more');
              });
              
              if (seeMoreButton) {
                console.log('Found "See more" button, clicking it');
                (seeMoreButton as HTMLElement).click();
                return true;
              }
              return false;
            });
            
            if (buttonVisible) {
              console.log('[GoogleAdsScraper] Clicked "See more" button, waiting for more content to load');
              // Wait for more content to load
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          } catch (clickError) {
            console.log('[GoogleAdsScraper] Error trying to click "See more" button:', clickError);
          }
          
          // Give more time for content to load after all interactions
          await new Promise(resolve => setTimeout(resolve, 8000));
        } catch (error) {
          console.log(`[GoogleAdsScraper] Secondary navigation attempt failed: ${error}`);
          return [];
        }
      }
      
      // Wait for dynamic content to load with human-like interactions
      console.log(`[GoogleAdsScraper] Simulating human browsing behavior...`);
      
      // Small wait
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
      
      // Implement more realistic human-like scrolling behavior
      await page.evaluate(() => {
        return new Promise((resolve) => {
          // Initial small scroll
          setTimeout(() => {
            window.scrollBy(0, 100 + Math.random() * 150);
            
            // Small pause, then continue scrolling
            setTimeout(() => {
              window.scrollBy(0, 200 + Math.random() * 150);
              
              // Another small pause
              setTimeout(() => {
                // Scroll back up a little bit (like a human looking for something)
                window.scrollBy(0, -120);
                
                setTimeout(() => {
                  // Continue scrolling down
                  window.scrollBy(0, 300 + Math.random() * 200);
                  
                  setTimeout(() => {
                    // One more scroll
                    window.scrollBy(0, 250 + Math.random() * 150);
                    
                    // Click any "See more" or "Load more" buttons if they exist
                    const loadMoreButton = Array.from(document.querySelectorAll('button, a')).find(el => {
                      const text = el.textContent?.trim().toLowerCase() || '';
                      return text.includes('see more') || 
                             text.includes('load more') || 
                             text.includes('view more') ||
                             text.includes('show more');
                    });
                    
                    if (loadMoreButton) {
                      console.log('Found and clicking "load more" button');
                      (loadMoreButton as HTMLElement).click();
                      
                      // Additional scroll after clicking "load more"
                      setTimeout(() => {
                        window.scrollBy(0, 300);
                        resolve(true);
                      }, 2000);
                    } else {
                      resolve(true);
                    }
                  }, 800 + Math.random() * 500);
                }, 700 + Math.random() * 300);
              }, 600 + Math.random() * 400);
            }, 500 + Math.random() * 300);
          }, 400 + Math.random() * 200);
        });
      });
      
      // Wait for any dynamic content to load
      console.log(`[GoogleAdsScraper] Waiting for dynamic content after scrolling...`);
      await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 3000));
      
      // Move mouse around to appear more human-like
      try {
        for (let i = 0; i < 3; i++) {
          await page.mouse.move(
            100 + Math.floor(Math.random() * 600),
            100 + Math.floor(Math.random() * 400)
          );
          await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
        }
      } catch (mouseError) {
        console.log(`[GoogleAdsScraper] Mouse movement error: ${mouseError}`);
      }
      
      // Final wait for any remaining content
      console.log(`[GoogleAdsScraper] Final wait for any dynamic content to fully load...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Log the current URL to help with debugging
      console.log(`Current page URL: ${page.url()}`);
      
      // Take a screenshot for debugging
      const screenshotPath = './temp/google-ads-page.png';
      try {
        // Create temp directory if it doesn't exist
        await fs.promises.mkdir('./temp', { recursive: true });
        
        // Take screenshot
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: true 
        });
        console.log(`[GoogleAdsScraper] Screenshot saved to ${screenshotPath}`);
      } catch (error) {
        console.error(`[GoogleAdsScraper] Failed to save screenshot: ${error}`);
      }
      
      // Check if ads were loaded - try different CSS selectors
      console.log(`[GoogleAdsScraper] Checking for ad elements on the page...`);
      
      // Try to find ads multiple times with delay in between
      let hasAds = false;
      let adSelector = '';
      let adCount = 0;
      
      // Try up to 3 times with delays in between
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`[GoogleAdsScraper] Attempt ${attempt} to find ad elements`);
        
        // Take a screenshot at each attempt for debugging
        try {
          await page.screenshot({ path: `./temp/google-ads-attempt-${attempt}.png`, fullPage: true });
          console.log(`[GoogleAdsScraper] Screenshot saved for attempt ${attempt}`);
        } catch (error) {
          console.error(`[GoogleAdsScraper] Failed to save attempt screenshot: ${error}`);
        }
        
        hasAds = await page.evaluate(() => {
          // Declare interface to extend Window
          interface CustomWindow extends Window {
            _lastAdSelector?: string;
            _lastAdCount?: number;
          }
          
          // Cast window to our custom interface
          const customWindow = window as CustomWindow;
          
          // Google changes their class names sometimes, so we try multiple selectors
          const possibleSelectors = [
            '.ad-card',
            '.ad-container', 
            '.ad-entry',
            '.adv-card',
            '[data-card-type="ad"]',
            '[data-testid="ad-card"]',
            '[data-testid="adTransparencyCard"]',
            '.ad-transparency-card',
            '.ad-search-result',
            '.adCard', 
            '.ad-container', 
            '.adContainer',
            '[data-ad-id]',
            '[data-testid="ad-card"]',
            '.gtc-ad-card',
            '.ad_card',
            // Try more general selectors as fallbacks
            '.card',
            '.transparency-card',
            'article',
            // Last resort selectors
            'img[src*="googleusercontent"]',
            '.grid-item'
          ];
          
          for (const selector of possibleSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements && elements.length > 0) {
              console.log(`Found ads using selector: ${selector} (count: ${elements.length})`);
              // Add properties to window for communication between contexts
              customWindow._lastAdSelector = selector;
              customWindow._lastAdCount = elements.length;
              return true;
            }
          }
          
          // Get all images, they might be ad-related even if not in expected containers
          const images = document.querySelectorAll('img');
          if (images && images.length > 0) {
            console.log(`Found ${images.length} images on the page, might contain ads`);
            customWindow._lastAdSelector = 'img';
            customWindow._lastAdCount = images.length;
            return images.length > 3; // Only consider it has ads if multiple images
          }
          
          return false;
        });
        
        // Get the selector and count from the page using the custom window interface
        adSelector = await page.evaluate(() => {
          interface CustomWindow extends Window {
            _lastAdSelector?: string;
            _lastAdCount?: number;
          }
          return (window as CustomWindow)._lastAdSelector || '';
        });
        
        adCount = await page.evaluate(() => {
          interface CustomWindow extends Window {
            _lastAdSelector?: string;
            _lastAdCount?: number;
          }
          return (window as CustomWindow)._lastAdCount || 0;
        });
        
        if (hasAds) {
          console.log(`[GoogleAdsScraper] Found ${adCount} ads using selector: ${adSelector}`);
          break;
        }
        
        // If no ads found, try an alternative approach - get page content
        if (!hasAds) {
          // Try to get text content of the entire page
          const pageContent = await page.evaluate(() => {
            return {
              title: document.title,
              bodyText: document.body.innerText,
              bodyHTML: document.body.innerHTML.slice(0, 10000), // First 10K chars only
              hasContent: document.body.innerText.length > 100
            };
          });
          
          console.log(`[GoogleAdsScraper] Page title: "${pageContent.title}"`);
          console.log(`[GoogleAdsScraper] Body text length: ${pageContent.bodyText.length} chars`);
          
          if (pageContent.hasContent) {
            // Log a sample of the content
            const textSample = pageContent.bodyText.slice(0, 300);
            console.log(`[GoogleAdsScraper] Content sample: "${textSample}..."`);
            
            // Check if it contains CAPTCHA/reCAPTCHA indicators
            if (
              pageContent.bodyText.includes('CAPTCHA') || 
              pageContent.bodyText.includes('captcha') ||
              pageContent.bodyText.includes('robot') || 
              pageContent.bodyText.includes('verification') ||
              pageContent.bodyText.includes('suspicious') ||
              pageContent.bodyText.includes('unusual activity')
            ) {
              console.log(`[GoogleAdsScraper] CAPTCHA or verification detected!`);
              
              // Take a screenshot of the CAPTCHA for debugging
              try {
                await page.screenshot({ 
                  path: './temp/google-ads-captcha.png', 
                  fullPage: true 
                });
                console.log(`[GoogleAdsScraper] CAPTCHA screenshot saved for analysis`);
                
                // Extract the CAPTCHA image if possible
                const captchaImage = await page.evaluate(() => {
                  const imgElement = document.querySelector('img[src*="captcha"]') as HTMLImageElement;
                  return imgElement ? imgElement.src : null;
                });
                
                if (captchaImage) {
                  console.log(`[GoogleAdsScraper] CAPTCHA image found: ${captchaImage.substring(0, 50)}...`);
                }
                
                // Try to work around the CAPTCHA with basic techniques
                // This won't solve complex CAPTCHAs but may get past simple checks
                
                // Try clicking "I'm not a robot" checkbox if present
                const clickedCheckbox = await page.evaluate(() => {
                  const checkbox = document.querySelector('.recaptcha-checkbox') as HTMLElement;
                  if (checkbox) {
                    checkbox.click();
                    return true;
                  }
                  return false;
                });
                
                if (clickedCheckbox) {
                  console.log(`[GoogleAdsScraper] Clicked CAPTCHA checkbox, waiting to see if it passes...`);
                  await new Promise(resolve => setTimeout(resolve, 5000));
                  
                  // Check if we successfully passed CAPTCHA
                  const captchaSuccess = await page.evaluate(() => {
                    return !document.body.innerText.includes('captcha') && 
                           !document.body.innerText.includes('CAPTCHA');
                  });
                  
                  if (captchaSuccess) {
                    console.log(`[GoogleAdsScraper] Successfully passed simple CAPTCHA check`);
                  } else {
                    console.log(`[GoogleAdsScraper] CAPTCHA still present after clicking checkbox`);
                  }
                }
              } catch (captchaError) {
                console.error(`[GoogleAdsScraper] Error handling CAPTCHA: ${captchaError}`);
              }
            }
          }
        }
        
        // If no ads found and not last attempt, wait and try again
        if (!hasAds && attempt < 3) {
          console.log(`[GoogleAdsScraper] No ads found on attempt ${attempt}, waiting to try again...`);
          
          // Try random mouse movements to appear more human-like
          try {
            await page.mouse.move(
              100 + Math.floor(Math.random() * 500), 
              100 + Math.floor(Math.random() * 300)
            );
            await new Promise(resolve => setTimeout(resolve, 500));
            await page.mouse.move(
              100 + Math.floor(Math.random() * 500), 
              100 + Math.floor(Math.random() * 300)
            );
          } catch (mouseError) {
            console.log(`[GoogleAdsScraper] Mouse movement error: ${mouseError}`);
          }
          
          // Try random scrolling
          await page.evaluate(() => {
            window.scrollBy(0, 200 + Math.floor(Math.random() * 300));
          });
          
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      if (!hasAds) {
        // Instead of returning empty array immediately, we'll try to extract any content
        // that might help debug why no ads were found
        try {
          console.log(`[GoogleAdsScraper] No specific ad elements found for ${searchQuery} - capturing page data...`);
          
          // Extract page metadata and content
          const pageData = await page.evaluate(() => {
            const meta = Array.from(document.querySelectorAll('meta')).map(el => {
              return {
                name: el.getAttribute('name') || el.getAttribute('property') || 'unknown',
                content: el.getAttribute('content')
              };
            });
            
            const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(el => el.textContent?.trim() || '');
            
            // Get all visible divs with content
            const divContents = Array.from(document.querySelectorAll('div'))
              .filter(div => {
                const rect = div.getBoundingClientRect();
                return rect.width > 50 && rect.height > 50; // Only reasonably sized divs
              })
              .map(div => div.textContent?.trim() || '')
              .filter(text => text && text.length > 20) // Only those with meaningful content
              .slice(0, 5); // Limit to 5 divs
            
            return {
              url: window.location.href,
              title: document.title,
              meta,
              headings,
              divContents
            };
          });
          
          console.log(`[GoogleAdsScraper] Page data extracted:`, {
            url: pageData.url,
            title: pageData.title,
            headingsCount: pageData.headings.length,
            divsCount: pageData.divContents.length
          });
          
          // If we found meaningful content, we can try to extract information even without specific ad elements
          if (pageData.divContents.length > 0) {
            console.log(`[GoogleAdsScraper] Found ${pageData.divContents.length} content divs, will attempt generic extraction`);
            
            // Try to find likely ad content elements by looking for content patterns
            try {
              // This custom extraction runs when standard selectors fail
              // It looks for any content that might represent ads based on structure and keywords
              const possibleAds = await page.evaluate(() => {
                interface GenericAd {
                  brand: string;
                  headline?: string | null;
                  body?: string | null;
                  imageUrl?: string | null;
                  adId?: string;
                }
                
                // Pattern matching - common ad-related keywords
                const adKeywords = [
                  'ad', 'advertisement', 'sponsored', 'promotion', 'campaign',
                  'view ad', 'learn more', 'shop now', 'sign up', 'download',
                  'install', 'buy now', 'get offer', 'click here'
                ];
                
                const brandKeywords = [
                  'by', 'from', 'advertiser', 'advertised by', 'brand',
                  'company', 'business', 'enterprise'
                ];
                
                // Find possible ad cards - any container with meaningful content
                const allContainers = Array.from(document.querySelectorAll('div, article, section'));
                const possibleAdContainers = allContainers.filter(container => {
                  // Must have some reasonable size
                  const rect = container.getBoundingClientRect();
                  if (rect.width < 200 || rect.height < 100) return false;
                  
                  // Must have some content
                  const text = container.textContent?.trim();
                  if (!text || text.length < 20) return false;
                  
                  // Should possibly have an image
                  const hasImage = container.querySelector('img') !== null;
                  
                  // Look for ad-related keywords
                  const hasAdKeyword = adKeywords.some(keyword => 
                    text.toLowerCase().includes(keyword.toLowerCase())
                  );
                  
                  // Give priority to elements with images and ad keywords
                  return hasImage || hasAdKeyword;
                });
                
                // Array to store extracted ad data
                const extractedAds: GenericAd[] = [];
                
                // Process each potential ad container
                for (let i = 0; i < Math.min(possibleAdContainers.length, 10); i++) {
                  const container = possibleAdContainers[i];
                  
                  // Extract headline - first heading or first strong text
                  let headline = '';
                  const headingEl = container.querySelector('h1, h2, h3, h4, h5, h6');
                  const strongEl = container.querySelector('strong, b');
                  if (headingEl && headingEl.textContent) {
                    headline = headingEl.textContent.trim();
                  } else if (strongEl && strongEl.textContent) {
                    headline = strongEl.textContent.trim();
                  }
                  
                  // Extract body text - paragraph or div with text content
                  let bodyText = '';
                  const paragraphs = Array.from(container.querySelectorAll('p, div'))
                    .filter(el => {
                      const text = el.textContent?.trim();
                      return text && text.length > 10 && text !== headline;
                    });
                  
                  if (paragraphs.length > 0) {
                    bodyText = paragraphs[0].textContent?.trim() || '';
                  }
                  
                  // Extract image if present
                  let imageUrl = null;
                  const imgEl = container.querySelector('img');
                  if (imgEl && 'src' in imgEl) {
                    imageUrl = (imgEl as HTMLImageElement).src;
                  }
                  
                  // Try to extract brand/advertiser name
                  let brand = 'Unknown Advertiser';
                  
                  // Look for elements with brand indicators
                  const allElements = Array.from(container.querySelectorAll('*'));
                  for (const element of allElements) {
                    const text = element.textContent?.trim();
                    if (!text) continue;
                    
                    // Check for brand identifiers like "By CompanyName"
                    for (const keyword of brandKeywords) {
                      if (text.toLowerCase().includes(keyword.toLowerCase())) {
                        const parts = text.split(new RegExp(`${keyword}\\s+`, 'i'));
                        if (parts.length > 1 && parts[1].length > 0) {
                          brand = parts[1].trim().split(' ')[0]; // Get first word after "by"
                          break;
                        }
                      }
                    }
                    
                    // Check if element itself might be a brand name (short text in specific elements)
                    if (text.length < 30 && 
                        ['span', 'div', 'small', 'em'].includes(element.tagName.toLowerCase()) &&
                        !adKeywords.some(kw => text.toLowerCase().includes(kw))) {
                      const potentialBrand = text.trim();
                      if (potentialBrand.length > 2 && potentialBrand.length < 25) {
                        brand = potentialBrand;
                      }
                    }
                  }
                  
                  // Generate a unique ID
                  const adId = `generic-${i}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                  
                  // Only add if we have at least some content
                  if (headline || bodyText || imageUrl) {
                    extractedAds.push({
                      brand,
                      headline: headline || null,
                      body: bodyText || null,
                      imageUrl,
                      adId
                    });
                  }
                }
                
                return extractedAds;
              });
              
              if (possibleAds && possibleAds.length > 0) {
                console.log(`[GoogleAdsScraper] Generic extraction found ${possibleAds.length} possible ads`);
                return possibleAds;
              }
            } catch (extractError) {
              console.error(`[GoogleAdsScraper] Error during generic extraction: ${extractError}`);
            }
          } else {
            console.log(`[GoogleAdsScraper] No content elements found that could be potential ads`);
            return [];
          }
        } catch (extractError) {
          console.error(`[GoogleAdsScraper] Error extracting page data: ${extractError}`);
          return [];
        }
      }
    } catch (error) {
      console.log(`Error navigating to advertiser page: ${error}`);
      return [];
    }
    
    // Extract the advertiser ID from the URL
    const url = page.url();
    const advertiserId = url.match(/advertiser\/(AR[0-9]+)/)?.[1];
    
    // Extract ad data from the page with robust selectors
    const ads = await page.evaluate((maxAdsToExtract, advertiserId) => {
      console.log('Inside page.evaluate() - beginning ad extraction');
      interface AdData {
        brand: string;
        headline?: string | null;
        body?: string | null;
        imageUrl?: string | null;
        thumbnailUrl?: string | null;
        cta?: string | null;
        adId?: string;
        platformDetails?: string | null;
        lastSeen?: string | null;
        advertiserId?: string;
      }

      // All possible selectors for ads
      const adCardSelectors = [
        '.ad-card', 
        '.adCard', 
        '.ad-container', 
        '.adContainer',
        '[data-ad-id]',
        '[data-testid="ad-card"]',
        '.gtc-ad-card',
        '.ad_card',
        // More general selectors as fallbacks
        '.card',
        '.transparency-card',
        'article',
        // Last resort selectors
        'img[src*="googleusercontent"]',
        '.grid-item'
      ];
      
      // Find the first selector that yields results
      let adCards: Element[] = [];
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
      
      const extractedAds: AdData[] = [];
      
      // Helper function to extract text with different selectors
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
          const el = element.querySelector(selector);
          if (el && (el as HTMLImageElement).src) {
            return (el as HTMLImageElement).src;
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
        
        // Try to find a unique ID from data attributes
        const dataAttrNames = Array.from(card.attributes || [])
          .filter((attr: { name: string }) => attr.name.startsWith('data-'))
          .map((attr: { name: string }) => attr.name);
          
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
    // Add debug log to track when this function is called
    console.log(`[GoogleAdsSearch] Starting search for: "${query}" (type: ${options.queryType})`);
    
    let advertisers: string[] = [];
    
    if (options.queryType === 'brand') {
      // For brand searches: Check if we have a known ID for this brand
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
        console.log(`[GoogleAdsSearch] Using known advertiser ID for brand ${normalizedBrand}: ${knownAdvertiserIds[normalizedBrand]}`);
      } else {
        // Otherwise use the brand name directly
        advertisers = [query];
        console.log(`[GoogleAdsSearch] No known ID for brand ${normalizedBrand}, using name directly`);
      }
    } else {
      // For keyword/industry queries, find relevant advertisers
      advertisers = findRelevantAdvertisers(query);
      console.log(`[GoogleAdsSearch] Found ${advertisers.length} relevant advertisers for ${options.queryType}: "${query}"`);
    }
    
    // Limit the number of advertisers to search to avoid long processing times
    const limitedAdvertisers = advertisers.slice(0, 2); // Reduced from 3 to 2 for faster results
    console.log(`[GoogleAdsSearch] Limited to ${limitedAdvertisers.length} advertisers: ${limitedAdvertisers.join(', ')}`);
    
    // Create an array to store all ads
    const allAds: CompetitorAd[] = [];
    
    // Search for each advertiser
    for (const advertiser of limitedAdvertisers) {
      try {
        console.log(`[GoogleAdsSearch] Processing advertiser: "${advertiser}"`);
        
        // Scrape ads for this advertiser
        const googleAds = await scrapeGoogleAdsForAdvertiser(advertiser, {
          region: options.region,
          maxAds: options.maxAds || 5, // Reduced from 10 to 5 for faster results
          searchType: options.queryType
        });
        
        console.log(`[GoogleAdsSearch] Found ${googleAds.length} ads for "${advertiser}"`);
        
        if (googleAds.length === 0) {
          console.log(`[GoogleAdsSearch] No ads found for "${advertiser}", continuing to next one`);
          continue;
        }
        
        // Save the ads to the database
        const savedAds = await saveGoogleAds(
          googleAds, 
          options.userId,
          options.queryType === 'industry' ? query : undefined
        );
        
        // Add the saved ads to our result array
        allAds.push(...savedAds);
        console.log(`[GoogleAdsSearch] Successfully saved ${savedAds.length} ads for "${advertiser}"`);
        
      } catch (error) {
        console.error(`[GoogleAdsSearch] Error fetching ads for advertiser "${advertiser}":`, error);
        // Continue with the next advertiser
      }
    }
    
    console.log(`[GoogleAdsSearch] Completed search for "${query}". Found total ${allAds.length} ads.`);
    return allAds;
  } catch (error) {
    console.error(`[GoogleAdsSearch] Fatal error searching Google ads for "${query}":`, error);
    // Return empty array instead of throwing to prevent cascading errors
    return [];
  }
}