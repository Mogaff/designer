import fs from 'fs';
import path from 'path';
import { log } from './vite';

/**
 * Validates base64 image data to ensure it has the correct structure
 * @param base64Data The base64-encoded image data to validate
 * @returns Object containing validation result and error message if any
 */
export function validateBase64Image(base64Data: string): { valid: boolean; error?: string } {
  // Verify the base64 format - should start with data:image format
  if (!base64Data.startsWith('data:image/')) {
    return { valid: false, error: 'Invalid format: Does not start with data:image/' };
  }

  // Verify it contains a base64 marker
  if (!base64Data.includes(';base64,')) {
    return { valid: false, error: 'Invalid format: No base64 marker' };
  }

  // Check if the actual base64 content looks valid (should contain valid base64 chars)
  const base64Content = base64Data.split(';base64,')[1];
  if (!base64Content || base64Content.length < 10) {
    return { valid: false, error: 'Missing or too short base64 content' };
  }

  // Base64 should have valid characters
  const validBase64Regex = /^[A-Za-z0-9+/=]+$/;
  if (!validBase64Regex.test(base64Content)) {
    return { 
      valid: false, 
      error: `Invalid base64 characters: ${base64Content.substring(0, 50)}...` 
    };
  }

  return { valid: true };
}

/**
 * Create a test image and return its base64 representation
 * Used for debugging image format issues
 */
export function createTestImage(): string {
  // Create a valid base64 image that is guaranteed to work
  const testSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
      <rect width="400" height="200" fill="#4337fe"/>
      <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dy=".3em">
        Test Image (Generated ${new Date().toISOString()})
      </text>
    </svg>
  `;
  
  // Convert the SVG to base64
  const base64 = Buffer.from(testSvg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Save a base64 image to disk for debugging
 * @param base64Data The base64 image data to save
 * @param name Optional name to include in the filename
 * @returns Path to the saved file
 */
export function saveBase64ImageForDebug(base64Data: string, name = 'debug'): string {
  try {
    // Extract the actual base64 content and image type
    let imageType = 'unknown';
    let content = base64Data;
    
    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/data:([^;]+);base64,(.+)/);
      if (matches && matches.length >= 3) {
        imageType = matches[1].split('/')[1] || 'unknown';
        content = matches[2];
      }
    }
    
    // Create temp directory if it doesn't exist
    const tempDir = path.resolve(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Save to a file
    const filePath = path.join(tempDir, `image-debug-${name}-${Date.now()}.${imageType}`);
    
    // Decode and save
    const buffer = Buffer.from(content, 'base64');
    fs.writeFileSync(filePath, buffer);
    
    log(`Saved debug image to ${filePath}`, "image-debug");
    return filePath;
  } catch (err) {
    log(`Error saving debug image: ${err}`, "image-debug");
    return '';
  }
}