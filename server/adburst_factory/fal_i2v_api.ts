/**
 * Fal AI Image-to-Video API Integration for AdBurst Factory
 * Handles image-to-video conversion using Fal AI's ltx-video-v095/image-to-video model
 */

import { fal } from "@fal-ai/client";
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

// Initialize the Fal AI client with API key from environment variables
const falApiKey = process.env.FAL_KEY || '';
if (!falApiKey) {
  console.error('FAL_KEY environment variable is not set');
} else {
  // Configure the client with API key
  fal.config({
    credentials: falApiKey
  });
}

// Log API key information (safely)
console.log(`Using Fal AI API key: ${falApiKey ? falApiKey.substring(0, 4) + '...' + falApiKey.substring(falApiKey.length - 4) : 'not set'}`);

// Function to check API key status
export async function checkFalApiKey(): Promise<boolean> {
  try {
    if (!falApiKey) {
      console.error('FAL_KEY environment variable is not set');
      return false;
    }
    
    // We'll perform a minimal status check to confirm API key works
    // This doesn't actually perform an image conversion but validates the API key
    const status = await fal.queue.status("fal-ai/ltx-video-v095/image-to-video", {
      requestId: "test", // This will fail but that's expected - we just want to check auth is valid
      logs: false,
    }).catch(err => {
      // We expect an error here due to invalid request ID
      // But we can check if it's an authentication error or just a not found error
      if (err.message && (
          err.message.includes("Authentication") || 
          err.message.includes("authorization") || 
          err.message.includes("Unauthorized"))) {
        throw new Error('Fal AI API key appears to be invalid');
      }
      // If we got here, it means the API key is valid but request ID not found which is expected
      return { valid: true };
    });
    
    console.log('Fal AI API key appears to be valid.');
    return true;
  } catch (error) {
    console.error('Error checking Fal AI API key status:', error);
    return false;
  }
}

// Default settings for video output
const DEFAULT_ASPECT_RATIO = "9:16"; // Vertical aspect ratio for social media
const DEFAULT_RESOLUTION = "720p"; // HD resolution
const DEFAULT_INFERENCE_STEPS = 40;

/**
 * Convert an image to a video using Fal AI's Image-to-Video API
 * 
 * @param imagePath Path to the input image file
 * @param prompt Text prompt describing the video to generate
 * @param options Additional options for video generation
 * @returns Path to the generated video file
 */
export async function imageToVideo(
  imagePath: string,
  prompt: string = "",
  options: {
    aspectRatio?: "16:9" | "9:16" | "1:1",
    resolution?: "480p" | "720p",
    negativePrompt?: string,
    numInferenceSteps?: number,
    seed?: number,
    expandPrompt?: boolean
  } = {}
): Promise<string> {
  console.log(`Converting image to video with Fal AI Image-to-Video: ${imagePath}`);
  
  try {
    // Read the image file as base64
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    
    // For the image-to-video conversion, we'll create a richer prompt
    // that includes instructions for creating motion from the still image
    const enhancedPrompt = prompt ? 
      `${prompt} - Create smooth, professional camera movement and animation from this still product image.` : 
      `Professional product demonstration with elegant camera movements and high-quality animation based on this image.`;
    
    // Map aspect ratio format
    let falAspectRatio: "16:9" | "9:16";
    if (options.aspectRatio === "1:1") {
      // For square images, use vertical aspect ratio for social media
      falAspectRatio = "9:16";
    } else {
      falAspectRatio = options.aspectRatio as "16:9" | "9:16" || "9:16";
    }
    
    // Set up the request parameters
    const requestParams = {
      input: {
        prompt: enhancedPrompt,
        negative_prompt: options.negativePrompt || "worst quality, inconsistent motion, blurry, jittery, distorted",
        resolution: options.resolution || DEFAULT_RESOLUTION,
        aspect_ratio: falAspectRatio || DEFAULT_ASPECT_RATIO,
        num_inference_steps: options.numInferenceSteps || DEFAULT_INFERENCE_STEPS,
        expand_prompt: options.expandPrompt !== undefined ? options.expandPrompt : true,
        image_url: imageBase64
      },
      logs: true,
      onQueueUpdate: (update: any) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log: any) => log.message).forEach(console.log);
        }
      },
    };
    
    console.log(`Calling Fal AI Image-to-Video API with prompt: "${enhancedPrompt}"`);
    
    // Make the API call to generate the video
    const result = await fal.subscribe("fal-ai/ltx-video-v095/image-to-video", requestParams);
    
    if (!result || !result.data || !result.data.video || !result.data.video.url) {
      throw new Error('No video data found in Fal AI Image-to-Video response');
    }
    
    console.log('Received response from Fal AI:', result.data);
    
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
    
    const videoOutputPath = path.join(outputDir, `fal-i2v-${uuidv4()}.mp4`);
    const videoResponseBuffer = await response.arrayBuffer();
    
    fs.writeFileSync(videoOutputPath, Buffer.from(videoResponseBuffer));
    
    console.log(`Video downloaded and saved to: ${videoOutputPath}`);
    return videoOutputPath;
  } catch (error) {
    console.error('Error generating video with Fal AI Image-to-Video:', error);
    throw new Error(`Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}