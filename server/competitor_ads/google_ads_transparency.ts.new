/**
 * Google Ads API Implementation
 * Uses OAuth with Google APIs to fetch competitor ads from Google's Search results
 */

import { CompetitorAd } from '@shared/schema';
import { 
  searchGoogleAds, 
  findRelevantAdvertisers, 
  transformGoogleAds, 
  getGoogleAdsForAdvertiser, 
  saveGoogleAds 
} from '../services/googleAdsService';
import { checkGoogleOAuthConfig } from '../services/googleOAuth';

// Export the required functions from our new service
export { 
  searchGoogleAds, 
  findRelevantAdvertisers, 
  transformGoogleAds, 
  getGoogleAdsForAdvertiser, 
  saveGoogleAds 
};

/**
 * Check if Google OAuth and Custom Search are configured
 */
export async function checkGoogleApiKeys(): Promise<boolean> {
  // Check if OAuth is configured
  const isOAuthConfigured = await checkGoogleOAuthConfig();
  
  // Check if CSE ID is configured
  const hasCseId = !!process.env.GOOGLE_CSE_ID;
  
  return isOAuthConfigured && hasCseId;
}