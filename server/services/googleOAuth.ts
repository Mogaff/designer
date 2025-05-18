/**
 * Google OAuth Service
 * Handles authentication with Google APIs using service account
 */

import { GoogleAuth, JWT } from 'google-auth-library';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Create a direct JWT client from credentials
let authClient: any = null;

try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    // Parse the credentials JSON
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    
    // Create a JWT client directly with the parsed credentials
    authClient = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        'https://www.googleapis.com/auth/adwords',
        'https://www.googleapis.com/auth/customsearch'
      ],
    });
    
    console.log('Google JWT client created from credentials JSON');
  }
} catch (error) {
  console.error('Error creating JWT client:', error);
  // Fall back to other authentication methods
}

// Fallback to GoogleAuth if JWT client creation failed
const auth = authClient || new GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/customsearch'
  ]
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
    if (authClient) {
      await authClient.getAccessToken();
      return true;
    } else if (typeof auth.getClient === 'function') {
      const client = await auth.getClient();
      await client.getAccessToken();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Google OAuth is not configured:', error);
    return false;
  }
}