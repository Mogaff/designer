/**
 * Anthropic AI utilities for AdBurst Factory
 * 
 * This file contains utility functions for working with Anthropic's Claude 3.7 model
 * to generate and process video content for the AdBurst Factory feature.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ensureTempDir, generateTempFilePath } from './adburst_utils';

// Initialize Anthropic client
// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate marketing copy for a product using Claude
 * @param options - Product information
 * @returns Generated marketing copy
 */
export async function generateMarketingCopy(options: {
  productName: string;
  productDescription?: string;
  targetAudience?: string;
}): Promise<string> {
  try {
    console.log('Generating marketing copy with Claude 3.7 Sonnet...');
    
    const systemPrompt = `You are an expert marketing copywriter. Your task is to create short, compelling ad copy for a product that will be used in a video advertisement.`;
    
    const userPrompt = `Write a concise, engaging 8-second advertisement script (about 30-40 words) for:
      
      Product: ${options.productName}
      ${options.productDescription ? `Description: ${options.productDescription}` : ''}
      ${options.targetAudience ? `Target Audience: ${options.targetAudience}` : ''}
      
      The copy should:
      - Start with a compelling hook
      - Clearly communicate the main benefit
      - Include a call-to-action
      - Be conversational and natural-sounding
      - Be exactly 30-40 words
      
      Return ONLY the script text, nothing else.`;
    
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      system: systemPrompt,
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Check if content is available and is of text type
    if (message.content && message.content[0] && 'text' in message.content[0]) {
      const copy = message.content[0].text.trim();
    console.log('Generated marketing copy:', copy);
    
    return copy;
  } catch (error) {
    console.error('Error generating marketing copy with Claude:', error);
    throw new Error(`Failed to generate marketing copy: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Analyze product images and provide creative direction for video
 * @param options - Images and product info
 * @returns Creative direction suggestions
 */
export async function analyzeProductImages(options: {
  imageBase64Array: string[];
  productName: string;
  productDescription?: string;
}): Promise<string> {
  try {
    console.log('Analyzing product images with Claude 3.7 Sonnet...');
    
    const systemPrompt = `You are an expert video director specialized in product advertisements. 
    Your task is to analyze product images and provide creative direction for a short 8-second vertical video ad.`;
    
    // Prepare message content with images
    const content = [
      {
        type: 'text',
        text: `Analyze these product images for ${options.productName}. 
          ${options.productDescription ? `Product description: ${options.productDescription}` : ''}
          
          Provide brief creative direction for a compelling 8-second vertical video advertisement. 
          Focus on visual flow, transitions, and key elements to highlight. 
          Keep your response under 100 words and focus on practical, actionable direction.`
      },
    ];
    
    // Add the images to the content
    options.imageBase64Array.forEach((base64, index) => {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: base64
        }
      });
    });
    
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      system: systemPrompt,
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    });

    const analysis = message.content[0].text.trim();
    console.log('Image analysis complete');
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing product images with Claude:', error);
    throw new Error(`Failed to analyze product images: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate a storyboard for the ad video
 * @param options - Product and direction info
 * @returns JSON storyboard data
 */
export async function generateStoryboard(options: {
  productName: string;
  productDescription?: string;
  creativeDirection: string;
  imageCount: number;
}): Promise<any> {
  try {
    console.log('Generating storyboard with Claude 3.7 Sonnet...');
    
    const systemPrompt = `You are an expert storyboard artist for short-form video advertisements.
    Your task is to create a detailed storyboard for an 8-second vertical video ad.`;
    
    const userPrompt = `Create a storyboard for an 8-second vertical (9:16) video advertisement for:
      
      Product: ${options.productName}
      ${options.productDescription ? `Description: ${options.productDescription}` : ''}
      
      Creative Direction: ${options.creativeDirection}
      
      Number of Available Images: ${options.imageCount}
      
      Please provide a JSON storyboard with the following structure:
      [
        {
          "frame": 1,
          "timestamp": "0.0-1.0",
          "description": "Opening shot description",
          "imageIndex": 0, // Index of the image to use (0-indexed)
          "textOverlay": "Text to display (if any)",
          "transition": "Type of transition to next frame"
        },
        // More frames...
      ]
      
      Create exactly 8 frames (one per second). Return ONLY valid JSON.`;
    
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      system: systemPrompt,
      max_tokens: 2048,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const jsonText = message.content[0].text.trim();
    
    // Extract JSON from response (in case there's any extra text)
    const jsonMatch = jsonText.match(/\[\s*\{.*\}\s*\]/s);
    if (!jsonMatch) {
      throw new Error('Failed to extract valid JSON storyboard from response');
    }
    
    const storyboard = JSON.parse(jsonMatch[0]);
    console.log('Generated storyboard with', storyboard.length, 'frames');
    
    return storyboard;
  } catch (error) {
    console.error('Error generating storyboard with Claude:', error);
    throw new Error(`Failed to generate storyboard: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate a full ad concept using Claude 3.7
 * @param options - All product and image data
 * @returns Complete ad concept
 */
export async function generateAdConcept(options: {
  imageBase64Array: string[];
  productName: string;
  productDescription?: string;
  targetAudience?: string;
}): Promise<{
  marketingCopy: string;
  creativeDirection: string;
  storyboard: any;
}> {
  try {
    // Step 1: Generate marketing copy
    const marketingCopy = await generateMarketingCopy({
      productName: options.productName,
      productDescription: options.productDescription,
      targetAudience: options.targetAudience
    });
    
    // Step 2: Analyze product images
    const creativeDirection = await analyzeProductImages({
      imageBase64Array: options.imageBase64Array,
      productName: options.productName,
      productDescription: options.productDescription
    });
    
    // Step 3: Generate storyboard
    const storyboard = await generateStoryboard({
      productName: options.productName,
      productDescription: options.productDescription,
      creativeDirection,
      imageCount: options.imageBase64Array.length
    });
    
    return {
      marketingCopy,
      creativeDirection,
      storyboard
    };
  } catch (error) {
    console.error('Error generating ad concept with Claude:', error);
    throw new Error(`Failed to generate ad concept: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Process images and return a complete ad strategy for video production
 * @param options - Images and product details
 * @returns Ad concept data
 */
export async function processImagesForAdConcept(options: {
  imagePaths: string[];
  productName: string;
  productDescription?: string;
  targetAudience?: string;
}): Promise<{
  marketingCopy: string;
  creativeDirection: string;
  storyboard: any;
}> {
  try {
    // Convert images to base64
    const imageBase64Array = options.imagePaths.map(imagePath => {
      const imageBuffer = fs.readFileSync(imagePath);
      return imageBuffer.toString('base64');
    });
    
    // Generate ad concept
    return await generateAdConcept({
      imageBase64Array,
      productName: options.productName,
      productDescription: options.productDescription,
      targetAudience: options.targetAudience
    });
  } catch (error) {
    console.error('Error processing images for ad concept:', error);
    throw new Error(`Failed to process images for ad concept: ${error instanceof Error ? error.message : String(error)}`);
  }
}