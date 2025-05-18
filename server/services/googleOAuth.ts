/**
 * Google OAuth Service
 * Handles authentication with Google APIs using service account
 */

import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Function to create credentials file from JSON string in environment variable
function setupCredentialsFile() {
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      const tmpdir = os.tmpdir();
      const credentialsPath = path.join(tmpdir, 'google-credentials.json');
      
      // Write the credentials JSON to a temporary file
      fs.writeFileSync(credentialsPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      
      // Set the environment variable to point to this file
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
      
      console.log('Google credentials file created from environment variable');
      return credentialsPath;
    }
    return null;
  } catch (error) {
    console.error('Error setting up Google credentials file:', error);
    return null;
  }
}

// Setup credentials file if JSON is provided
const credentialsPath = setupCredentialsFile();

// Create a Google Auth client using environment variables
const auth = new GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/customsearch'
  ],
  // If a credentials file was created or exists, use it
  keyFilename: credentialsPath || process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || undefined
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