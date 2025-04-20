/**
 * OpenAI GPT-4o API Integration for AdBurst Factory
 * Handles script generation for ad voiceovers
 */

import OpenAI from 'openai';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate an ad script using OpenAI's GPT-4o model
 * Optimized for short, engaging ad copy suitable for an 8-second video
 * 
 * @param options Object containing product details
 * @returns The generated script text
 */
export async function generateAdScript(options: {
  productName: string;
  productDescription?: string;
  targetAudience?: string;
}): Promise<string> {
  console.log('Generating ad script with GPT-4o...', options);
  
  try {
    const systemPrompt = 
      `You are an expert marketing copywriter specializing in concise, high-impact ad scripts. 
      Create scripts that are attention-grabbing, benefit-focused, and include clear calls-to-action.
      The scripts must be short enough for an 8-second video advertisement (30-40 words maximum).`;
    
    const userPrompt = `Write a short, compelling script for an 8-second vertical video ad with the following details:
      
      Product Name: ${options.productName}
      ${options.productDescription ? `Product Description: ${options.productDescription}` : ''}
      ${options.targetAudience ? `Target Audience: ${options.targetAudience}` : ''}
      
      Requirements:
      - Begin with an attention-grabbing hook
      - Clearly communicate one key benefit
      - Include a concise call-to-action
      - MUST be 30-40 words MAXIMUM (critical for an 8-second ad)
      - Sound natural when read aloud
      
      Return ONLY the script text without any additional commentary.`;
    
    // Call GPT-4o to generate the script
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7, // Balance between creativity and consistency
      max_tokens: 100, // Limit to ensure we get a short script
    });
    
    // Extract and clean the generated script text
    const scriptText = response.choices[0]?.message?.content?.trim() || "";
    
    console.log('Generated script with GPT-4o:', scriptText);
    return scriptText;
  } catch (error) {
    console.error('Error generating script with GPT-4o:', error);
    throw new Error(`Failed to generate script: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}