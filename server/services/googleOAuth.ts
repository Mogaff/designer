/**
 * Google OAuth Service
 * Handles authentication with Google APIs using service account
 */

import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

// Create a Google Auth client using environment variables
const auth = new GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/customsearch'
  ],
  // If a service account key is provided as an environment variable, use it
  // Otherwise, try to use application default credentials
  keyFilename: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || undefined
});

/**
 * Get an authenticated Google API client
 */
export async function getGoogleClient() {
  try {
    // Get an authenticated client
    const client = await auth.getClient();
    return { client, auth };
  } catch (error) {
    console.error('Error getting Google Auth client:', error);
    throw new Error(`Failed to authenticate with Google: ${(error as Error).message}`);
  }
}

/**
 * Get an authenticated Google Custom Search API client
 */
export async function getCustomSearchClient() {
  try {
    const { auth } = await getGoogleClient();
    
    // Create a custom search client
    const customsearch = google.customsearch('v1');
    
    return { customsearch, auth };
  } catch (error) {
    console.error('Error getting Google Custom Search client:', error);
    throw new Error(`Failed to create Google Custom Search client: ${(error as Error).message}`);
  }
}

/**
 * Check if Google OAuth is configured correctly
 */
export async function checkGoogleOAuthConfig(): Promise<boolean> {
  try {
    // Try to get a token to verify the authentication works
    const client = await auth.getClient();
    await client.getAccessToken();
    
    return true;
  } catch (error) {
    console.error('Google OAuth is not configured:', error);
    return false;
  }
}