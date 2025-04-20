/**
 * Google Veo 2 API Integration for AdBurst Factory
 * Handles image-to-video conversion using Google's Veo 2 API
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Initialize the Generative AI API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Vertical 9:16 aspect ratio settings for video output
const VIDEO_ASPECT_RATIO = "9:16";
const VIDEO_DURATION_SECONDS = 8;

/**
 * Convert an image to a video using Google's Veo 2 API
 * @param imagePath Path to the input image file
 * @returns Path to the generated video file
 */
export async function imageToVideo(imagePath: string): Promise<string> {
  console.log(`Converting image to video with Veo 2: ${imagePath}`);
  
  try {
    // Read the image file as base64
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    
    // Set up the Veo 2 model - specifically using Gemini 1.5 Pro Flash for its video generation capabilities
    // This model has video generation capabilities in the current API
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash-latest",  // Flash model supports video generation and is more efficient
      systemInstruction: "You are a video generation expert that creates high-quality video content from images. Create ONLY videos, never still images or text."
    });
    
    // Define parameters for video generation with specific instructions for Veo 2
    // We need to include all video parameters directly in the prompt since the Veo 2 API
    // doesn't directly support a videoConfig parameter structure yet
    const prompt = `Generate a vertical video for a product advertisement with these exact specifications:
                   
                   TECHNICAL REQUIREMENTS (CRITICAL - MUST FOLLOW EXACTLY):
                   * Generate VIDEO output, not an image
                   * Video duration: ${VIDEO_DURATION_SECONDS} seconds exactly
                   * Aspect ratio: ${VIDEO_ASPECT_RATIO} (vertical/portrait orientation)
                   * Frame rate: 30fps
                   * Resolution: 1080x1920 pixels
                   
                   STYLE REQUIREMENTS:
                   * Professional product showcase with elegant camera movements
                   * Luxury/premium aesthetic with soft lighting
                   * Gentle zoom effects that highlight product features
                   * Subtle transitions and movement (slow, controlled camera)
                   * Clean background that emphasizes the product
                   
                   PURPOSE:
                   * Social media advertisement for TikTok and Instagram
                   * Designed to showcase product quality and features
                   * Optimized for mobile viewing in vertical format
                   
                   This is for a real client campaign, so please create an actual video animation, not still frames.`;
    
    // Make the actual Veo 2 API call
    console.log(`Calling Veo 2 API with prompt: ${prompt}`);
    
    // Prepare the request content for Gemini's new Veo 2 API
    // This follows the format expected by the current @google/generative-ai SDK
    const parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      }
    ];
    
    // Generation configuration optimized for video generation
    // These parameters are tuned specifically for video quality and stability
    const generationConfig = {
      temperature: 0.2,        // Lower temperature for more deterministic results
      topP: 0.8,               // Lower topP for more focused output
      topK: 40,                // Reasonable topK value
      maxOutputTokens: 2048,   // Higher token limit for complex media generation
      safetySettings: [        // Adjust safety settings to allow creative content
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_ONLY_HIGH'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH'
        }
      ]
    };
    
    // Make the actual Gemini/Veo 2 API call with proper types
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig
    });
    
    const response = await result.response;
    
    // Extract the response from Gemini
    // The video response structure is complex and may change, so we log the structure first
    console.log('Received response from Gemini/Veo 2:', 
      JSON.stringify(response, null, 2).substring(0, 500) + '...');
    
    // Try to extract video data using multiple possible response structures
    let videoData;
    
    if (response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];
      
      // Try to find video part in different possible locations
      const parts = candidate.content?.parts || [];
      
      // Look through all parts for a video property
      for (const part of parts) {
        if (part.video) {
          videoData = part.video.data;
          break;
        }
        
        // Check for inline_data which might contain video
        if (part.inlineData && part.inlineData.mimeType?.startsWith('video/')) {
          videoData = part.inlineData.data;
          break;
        }
        
        // Check for various formats that might exist
        if (part.videoData) {
          videoData = part.videoData;
          break;
        }
      }
      
      // In case video is directly in the content
      if (!videoData && candidate.content?.video?.data) {
        videoData = candidate.content.video.data;
      }
      
      // In case video is in a different format
      if (!videoData && candidate.videoContent) {
        videoData = candidate.videoContent;
      }
    }
    
    // If we still don't have video data, log what we received and throw an error
    if (!videoData) {
      console.error('Response structure:', JSON.stringify(response, null, 2));
      throw new Error('No video data found in Veo 2 API response');
    }
    
    // Save the video to a file
    const outputDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const videoOutputPath = path.join(outputDir, `veo-${uuidv4()}.mp4`);
    
    // Save the actual video from the API
    fs.writeFileSync(videoOutputPath, Buffer.from(videoData, 'base64'));
    
    console.log(`Video generated: ${videoOutputPath}`);
    return videoOutputPath;
  } catch (error) {
    console.error('Error generating video with Veo 2 API:', error);
    throw new Error(`Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}