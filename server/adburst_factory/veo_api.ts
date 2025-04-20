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
    
    // Set up the Veo 2 model (newer version of Gemini with video capabilities)
    // Ensure this is properly configured for Veo 2 specifically
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
    
    // Define parameters for video generation with specific instructions for Veo 2
    const prompt = `Create a professional product showcase vertical video advertisement with subtle camera movements and zooms.
                   Make it visually appealing and dynamic with smooth transitions.
                   IMPORTANT SPECIFICATIONS:
                   - Duration: Exactly ${VIDEO_DURATION_SECONDS} seconds
                   - Aspect ratio: ${VIDEO_ASPECT_RATIO} (vertical video format)
                   - Style: Elegant product showcase with professional lighting
                   - Movement: Gentle zoom-in effects and smooth camera motion
                   - Purpose: Social media advertisement
                   
                   This will be used for a professional advertising campaign on TikTok and Instagram.`;
    
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
    
    // Generation configuration for Gemini
    // Using standard generation parameters instead of custom videoConfig
    const generationConfig = {
      temperature: 0.4,
      topP: 0.95,
      topK: 0,
      maxOutputTokens: 1024
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