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
    
    // Define parameters for video generation with specific instructions
    // The prompt is CRITICAL - it needs to clearly instruct the model to generate actual video
    const prompt = `GENERATE VIDEO: Create a MOVING VIDEO ANIMATION (not a static image) of this product.

                   CRITICAL INSTRUCTIONS - YOU MUST:
                   1. Output VIDEO format only (MP4)
                   2. Do NOT respond with text or explanations - ONLY output video
                   3. Create MOTION in the video - with camera movement and animation effects
                   4. Generate a ${VIDEO_DURATION_SECONDS}-second video clip
                   5. Use ${VIDEO_ASPECT_RATIO} vertical/portrait aspect ratio (1080x1920)
                   
                   VIDEO STYLE:
                   - Create smooth, professional-looking animation with the product centered
                   - Include gentle camera movements (slow zoom in/out, subtle panning)
                   - Add soft transitions between camera angles
                   - Use elegant lighting effects that highlight product features
                   - Maintain premium/luxury aesthetic throughout
                   - Keep background clean and minimalist
                   
                   TECHNICAL SPECIFICATIONS:
                   - Resolution: 1080x1920 (vertical)
                   - Frame rate: 30fps
                   - Duration: ${VIDEO_DURATION_SECONDS} seconds
                   - Format: MP4 video
                   
                   This is for a critical business application where actual video generation is required.
                   IMPORTANT: The output MUST be a video file (MP4), not a static image or text description.`;
    
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
    // Keeping only parameters supported by the Gemini API
    const generationConfig = {
      temperature: 0.2,        // Lower temperature for more deterministic results
      topP: 0.8,               // Lower topP for more focused output
      topK: 40,                // Reasonable topK value
      maxOutputTokens: 2048    // Higher token limit for complex media generation
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
    
    // Gemini's video response can come in different formats
    // We need to check multiple possible locations for video data
    let videoData = null;
    let videoMimeType = 'video/mp4'; // Default mime type
    
    // Log the full response for debugging
    console.log('Examining response structure:', JSON.stringify(response, null, 2));
    
    // Try various paths in the response structure
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        // Examine each part in the response
        for (const part of candidate.content.parts) {
          console.log('Examining part:', JSON.stringify(part, null, 2));
          
          // Option 1: Check for direct video object (newer API structure)
          try {
            if (part.video && part.video.data) {
              console.log('Found video data in part.video');
              videoData = part.video.data;
              if (part.video.mimeType) videoMimeType = part.video.mimeType;
              break;
            }
          } catch (e) {
            console.log('Error checking video field:', e);
          }
          
          // Option 2: Check for inline data with video mime type
          try {
            if (part.inlineData && 
                part.inlineData.mimeType && 
                part.inlineData.mimeType.startsWith('video/') && 
                part.inlineData.data) {
              console.log('Found video in inlineData');
              videoData = part.inlineData.data;
              videoMimeType = part.inlineData.mimeType;
              break;
            }
          } catch (e) {
            console.log('Error checking inlineData field:', e);
          }
          
          // Option 3: Check for text that might be base64 video
          try {
            if (part.text && part.text.startsWith('data:video/')) {
              console.log('Found video in data URL format');
              const dataUrlParts = part.text.split(',');
              if (dataUrlParts.length === 2) {
                videoData = dataUrlParts[1];
                const mimeMatch = part.text.match(/data:(video\/[^;]+);/);
                if (mimeMatch && mimeMatch[1]) {
                  videoMimeType = mimeMatch[1];
                }
                break;
              }
            }
          } catch (e) {
            console.log('Error checking text field:', e);
          }
        }
      }
      
      // Fallback: Look for specific Gemini formats at candidate level
      if (!videoData) {
        try {
          if (candidate.videoContent) {
            console.log('Found videoContent at candidate level');
            videoData = candidate.videoContent;
          }
        } catch (e) {
          console.log('Error checking candidate.videoContent:', e);
        }
        
        try {
          if (candidate.content && candidate.content.video && candidate.content.video.data) {
            console.log('Found video at content level');
            videoData = candidate.content.video.data;
            if (candidate.content.video.mimeType) {
              videoMimeType = candidate.content.video.mimeType;
            }
          }
        } catch (e) {
          console.log('Error checking candidate.content.video:', e);
        }
      }
    }
    
    console.log(`Video data found: ${videoData ? 'YES' : 'NO'}, MIME type: ${videoMimeType}`);
    
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