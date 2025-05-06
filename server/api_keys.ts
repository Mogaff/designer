/**
 * API Key Management
 * Centralizes validation and handling of all API keys used in the application
 */

import { validateFireCrawlApiKey } from './competitor_ads/firecrawl_client';
import { log } from './vite';

// Define the keys we're checking
export type ApiKeyConfig = {
  name: string;
  envVarName: string;
  validator?: () => Promise<boolean>;
  isValid?: boolean;
};

// Configuration for all API keys used in the application
export const API_KEYS: ApiKeyConfig[] = [
  { 
    name: 'gemini',
    envVarName: 'GEMINI_API_KEY'
  },
  { 
    name: 'claude',
    envVarName: 'ANTHROPIC_API_KEY'
  },
  { 
    name: 'openai',
    envVarName: 'OPENAI_API_KEY'
  },
  { 
    name: 'elevenlabs',
    envVarName: 'ELEVENLABS_API_KEY'
  },
  { 
    name: 'kling',
    envVarName: 'KLING_API_KEY'
  },
  { 
    name: 'fal',
    envVarName: 'FAL_API_KEY'
  },
  {
    name: 'firecrawl',
    envVarName: 'FIRECRAWL_API_KEY',
    validator: validateFireCrawlApiKey
  }
];

/**
 * Check if a specific API key exists and is valid
 */
export async function checkApiKey(name: string): Promise<boolean> {
  const apiKey = API_KEYS.find(key => key.name === name);
  
  if (!apiKey) {
    return false;
  }
  
  const keyValue = process.env[apiKey.envVarName];
  
  if (!keyValue) {
    log(`${apiKey.envVarName} environment variable is not set`);
    console.log(`Using ${apiKey.name} API key: not set`);
    return false;
  }
  
  // If the key has a validator function, use it
  if (apiKey.validator) {
    try {
      const isValid = await apiKey.validator();
      apiKey.isValid = isValid;
      if (isValid) {
        log(`${apiKey.name} API key appears to be valid.`);
        log(`${apiKey.name} API key validation successful`);
      } else {
        log(`✗ ${apiKey.name} API key validation failed`);
      }
      return isValid;
    } catch (error) {
      log(`Error validating ${apiKey.name} API key: ${error}`);
      return false;
    }
  }
  
  // If no validator, just check that the key exists
  apiKey.isValid = true;
  return true;
}

/**
 * Check all API keys and return results
 */
export async function checkAllApiKeys(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  for (const apiKey of API_KEYS) {
    const isValid = await checkApiKey(apiKey.name);
    results[apiKey.name] = isValid;
    
    // Log key info with masking for security
    const keyValue = process.env[apiKey.envVarName];
    if (keyValue) {
      // Display first and last few chars for key identification while hiding most of it
      const maskedKey = maskApiKey(keyValue);
      log(`✓ ${apiKey.name} API key found (${keyValue.length} chars): ${maskedKey}`);
    } else {
      log(`✗ ${apiKey.name} API key is not set`);
    }
  }
  
  log(`API key check results: ${JSON.stringify(results, null, 2)}`);
  
  return results;
}

/**
 * Mask an API key for logging (show first 4 and last 4 characters, hide the rest)
 */
function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return '****';
  }
  
  const first = key.slice(0, 4);
  const last = key.slice(-4);
  return `${first}...${last}`;
}