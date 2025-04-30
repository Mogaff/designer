/**
 * Kling Image-to-Video API Integration for AdBurst Factory
 * Handles image-to-video conversion using Kling's API
 */

import { fal } from "@fal-ai/client";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Initialize the Kling API with API key from environment variables
// We'll add a check to verify the API key is set
const klingApiKey = process.env.KLING_API_KEY || '';
if (!klingApiKey) {
  console.error('KLING_API_KEY environment variable is not set');
} else {
  // Configure the client with API key
  fal.config({
    credentials: klingApiKey
  });
}

// Log API key information (safely)
console.log(`Using Kling API key: ${klingApiKey ? klingApiKey.substring(0, 4) + '...' + klingApiKey.substring(klingApiKey.length - 4) : 'not set'}`);

// Function to check API key status
export async function checkKlingApiKey(): Promise<boolean> {
  try {
    if (!klingApiKey) {
      console.error('KLING_API_KEY environment variable is not set');
      return false;
    }
    
    // We'll perform a minimal status check to confirm API key works
    // This doesn't actually perform an image conversion but validates the API key
    const status = await fal.queue.status("fal-ai/kling-video/v1/pro/image-to-video", {
      requestId: "test", // This will fail but that's expected - we just want to check auth is valid
      logs: false,
    }).catch(err => {
      // We expect an error here due to invalid request ID
      // But we can check if it's an authentication error or just a not found error
      if (err.message && (
          err.message.includes("Authentication") || 
          err.message.includes("authorization") || 
          err.message.includes("Unauthorized"))) {
        throw new Error('Kling API key appears to be invalid');
      }
      // If we got here, it means the API key is valid but request ID not found which is expected
      return { valid: true };
    });
    
    console.log('Kling API key appears to be valid.');
    return true;
  } catch (error) {
    console.error('Error checking Kling API key status:', error);
    return false;
  }
}

// Vertical 9:16 aspect ratio settings for video output (for social media)
const DEFAULT_ASPECT_RATIO = "9:16";
const DEFAULT_VIDEO_DURATION = "5"; // 5 seconds
const DEFAULT_CFG_SCALE = 0.5;

/**
 * Convert an image to a video using Kling's Image-to-Video API
 * @param imagePath Path to the input image file
 * @param prompt Text prompt describing the motion/action for the video
 * @returns Path to the generated video file
 */
export async function imageToVideo(
  imagePath: string,
  prompt: string = "",
  options: {
    duration?: "5" | "10",
    aspectRatio?: "16:9" | "9:16" | "1:1",
    cfgScale?: number,
    negativePrompt?: string
  } = {}
): Promise<string> {
  console.log(`Converting image to video with Kling: ${imagePath}`);
  
  try {
    // Read the image file as base64
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    
    // Default prompt if none provided
    const defaultPrompt = "Professional product demonstration with smooth camera movement";
    const videoPrompt = prompt || defaultPrompt;
    
    // Set up the request parameters
    const requestParams = {
      input: {
        prompt: videoPrompt,
        image_url: imageBase64,
        duration: options.duration || DEFAULT_VIDEO_DURATION,
        aspect_ratio: options.aspectRatio || DEFAULT_ASPECT_RATIO,
        cfg_scale: options.cfgScale || DEFAULT_CFG_SCALE,
        negative_prompt: options.negativePrompt || "blur, distort, and low quality"
      },
      logs: true,
      onQueueUpdate: (update: any) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log: any) => log.message).forEach(console.log);
        }
      },
    };
    
    console.log(`Calling Kling API with prompt: ${videoPrompt}`);
    
    // Make the actual Kling API call
    const result = await fal.subscribe("fal-ai/kling-video/v1/pro/image-to-video", requestParams);
    
    if (!result || !result.data || !result.data.video || !result.data.video.url) {
      throw new Error('No video data found in Kling API response');
    }
    
    console.log('Received response from Kling:', result.data);
    
    // Download the video from the URL
    const videoUrl = result.data.video.url;
    const response = await fetch(videoUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download video from ${videoUrl}: ${response.statusText}`);
    }
    
    // Save the video to a file
    const outputDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const videoOutputPath = path.join(outputDir, `kling-${uuidv4()}.mp4`);
    const videoBuffer = await response.arrayBuffer();
    
    fs.writeFileSync(videoOutputPath, Buffer.from(videoBuffer));
    
    console.log(`Video downloaded and saved to: ${videoOutputPath}`);
    return videoOutputPath;
  } catch (error) {
    console.error('Error generating video with Kling API:', error);
    throw new Error(`Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}