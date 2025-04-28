/**
 * Simplified Anthropic AI utilities for AdBurst Factory
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

// Initialize Anthropic client
// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate marketing copy for a product using Claude
 */
export async function generateMarketingCopy(options: {
  productName: string;
  productDescription?: string;
  targetAudience?: string;
}): Promise<string> {
  try {
    console.log('Generating marketing copy with Claude 3.7 Sonnet...');
    
    const systemPrompt = `You are Claude, an award-winning, highly skilled graphic design expert. You create stunning, modern, and engaging visual designs with a professional polish. Your focus is on creating compelling marketing copy that drives audience engagement and action. Use your expertise to create short, compelling ad copy for a product that will be used in a video advertisement.`;
    
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
    
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      system: systemPrompt,
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Get the response text
    const content = response.content[0];
    const copy = content.type === 'text' ? content.text.trim() : '';
    
    console.log('Generated marketing copy:', copy);
    return copy;
  } catch (error) {
    console.error('Error generating marketing copy with Claude:', error);
    throw new Error(`Failed to generate marketing copy: ${error instanceof Error ? error.message : String(error)}`);
  }
}