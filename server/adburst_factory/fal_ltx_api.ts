/**
 * Fal AI LTX Video API Integration for AdBurst Factory
 * Handles video generation using Fal AI's ltx-video-v095 model
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
    // This doesn't actually perform a video generation but validates the API key
    const status = await fal.queue.status("fal-ai/ltx-video-v095/extend", {
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
 * Generate a video from a prompt using Fal AI LTX Video model
 * 
 * NOTE: The LTX model requires a video input, so we first create a simple video with FFmpeg
 * and then use that as input for the LTX model.
 * 
 * @param prompt Text prompt describing the video to generate
 * @param options Additional options for video generation
 * @returns Path to the generated video file
 */
export async function generateVideo(
  prompt: string,
  options: {
    aspectRatio?: "16:9" | "9:16",
    resolution?: "480p" | "720p",
    negativePrompt?: string,
    numInferenceSteps?: number,
    seed?: number,
    expandPrompt?: boolean
  } = {}
): Promise<string> {
  console.log(`Generating video with Fal AI LTX model: "${prompt}"`);
  
  try {
    // Create a simple base video to extend
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Generate a plain colored video with FFmpeg
    const baseVideoPath = path.join(tempDir, `base-${uuidv4()}.mp4`);
    const ffmpegCmd = `ffmpeg -f lavfi -i color=c=gray:s=1080x1920:d=1 -c:v libx264 -pix_fmt yuv420p ${baseVideoPath}`;
    
    try {
      require('child_process').execSync(ffmpegCmd);
      console.log('Created base video:', baseVideoPath);
    } catch (ffmpegError) {
      console.error('Error creating base video:', ffmpegError);
      throw new Error('Failed to create base video using FFmpeg');
    }
    
    // Read the video file as base64
    const videoBuffer = fs.readFileSync(baseVideoPath);
    const videoBase64 = videoBuffer.toString('base64');
    
    // Set up the request parameters with the required video field
    const requestParams = {
      input: {
        prompt: prompt,
        negative_prompt: options.negativePrompt || "worst quality, inconsistent motion, blurry, jittery, distorted",
        resolution: options.resolution || DEFAULT_RESOLUTION,
        aspect_ratio: options.aspectRatio || DEFAULT_ASPECT_RATIO,
        num_inference_steps: options.numInferenceSteps || DEFAULT_INFERENCE_STEPS,
        expand_prompt: options.expandPrompt !== undefined ? options.expandPrompt : true,
        video: {
          video_url: `data:video/mp4;base64,${videoBase64}`,
          start_frame_num: 0
        }
      },
      logs: true,
      onQueueUpdate: (update: any) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log: any) => log.message).forEach(console.log);
        }
      },
    };
    
    console.log(`Calling Fal LTX API with parameters:`, JSON.stringify(requestParams.input, null, 2));
    
    // Make the API call to generate the video
    const result = await fal.subscribe("fal-ai/ltx-video-v095/extend", requestParams);
    
    if (!result || !result.data || !result.data.video || !result.data.video.url) {
      throw new Error('No video data found in Fal AI LTX response');
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
    
    const videoOutputPath = path.join(outputDir, `fal-ltx-${uuidv4()}.mp4`);
    const videoResponseBuffer = await response.arrayBuffer();
    
    fs.writeFileSync(videoOutputPath, Buffer.from(videoResponseBuffer));
    
    console.log(`Video downloaded and saved to: ${videoOutputPath}`);
    return videoOutputPath;
  } catch (error) {
    console.error('Error generating video with Fal AI LTX:', error);
    throw new Error(`Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a video from an existing video using Fal AI LTX Video extend feature
 * @param videoPath Path to the input video file
 * @param prompt Text prompt describing how to extend the video
 * @param options Additional options for video generation
 * @returns Path to the generated video file
 */
export async function extendVideo(
  videoPath: string,
  prompt: string,
  options: {
    startFrameNum?: number,
    aspectRatio?: "16:9" | "9:16",
    resolution?: "480p" | "720p",
    negativePrompt?: string,
    numInferenceSteps?: number,
    seed?: number,
    expandPrompt?: boolean
  } = {}
): Promise<string> {
  console.log(`Extending video with Fal AI LTX model: ${videoPath}`);
  
  try {
    // Read the video file as base64
    const videoBuffer = fs.readFileSync(videoPath);
    const videoBase64 = videoBuffer.toString('base64');
    
    // Set up the request parameters
    const requestParams = {
      input: {
        prompt: prompt,
        negative_prompt: options.negativePrompt || "worst quality, inconsistent motion, blurry, jittery, distorted",
        resolution: options.resolution || DEFAULT_RESOLUTION,
        aspect_ratio: options.aspectRatio || DEFAULT_ASPECT_RATIO,
        num_inference_steps: options.numInferenceSteps || DEFAULT_INFERENCE_STEPS,
        expand_prompt: options.expandPrompt !== undefined ? options.expandPrompt : true,
        video: {
          video_url: `data:video/mp4;base64,${videoBase64}`,
          start_frame_num: options.startFrameNum || 0
        }
      },
      logs: true,
      onQueueUpdate: (update: any) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log: any) => log.message).forEach(console.log);
        }
      },
    };
    
    console.log(`Calling Fal LTX API (extend) with prompt: ${prompt}`);
    
    // Make the API call to extend the video
    const result = await fal.subscribe("fal-ai/ltx-video-v095/extend", requestParams);
    
    if (!result || !result.data || !result.data.video || !result.data.video.url) {
      throw new Error('No video data found in Fal AI LTX response');
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
    
    const videoOutputPath = path.join(outputDir, `fal-ltx-extended-${uuidv4()}.mp4`);
    const extendedVideoBuffer = await response.arrayBuffer();
    
    fs.writeFileSync(videoOutputPath, Buffer.from(extendedVideoBuffer));
    
    console.log(`Extended video downloaded and saved to: ${videoOutputPath}`);
    return videoOutputPath;
  } catch (error) {
    console.error('Error extending video with Fal AI LTX:', error);
    throw new Error(`Failed to extend video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert an image to a video using Fal AI LTX Video model
 * This function serves as the compatible interface for the existing AdBurst Factory
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
    negativePrompt?: string
  } = {}
): Promise<string> {
  console.log(`Converting image to video with Fal AI LTX: ${imagePath}`);
  
  try {
    // For the image-to-video conversion, we'll create a richer prompt
    // that includes instructions for creating motion from the still image
    const enhancedPrompt = prompt ? 
      `${prompt} - Create smooth, professional camera movement and animation from this still product image.` : 
      `Professional product demonstration with elegant camera movements and high-quality animation based on this image.`;
    
    // Map aspect ratio format to match Fal AI's expected format
    let falAspectRatio: "16:9" | "9:16";
    if (options.aspectRatio === "1:1") {
      // For square images, use vertical aspect ratio for social media
      falAspectRatio = "9:16";
    } else {
      falAspectRatio = options.aspectRatio as "16:9" | "9:16" || "9:16";
    }
    
    // Read the image file as base64
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    const mimeType = 'image/jpeg'; // assuming JPEG format, adjust as needed
    
    // Create a simple video from the image using FFmpeg
    // This is because Fal AI's ltx-video model expects a video input for extending
    // We'll create a 1-second static video from our image
    const tempVideoPath = path.join(process.cwd(), 'temp', `temp-${uuidv4()}.mp4`);
    const ffmpegCmd = `ffmpeg -loop 1 -i ${imagePath} -c:v libx264 -t 1 -pix_fmt yuv420p -vf "scale=1080:1920" ${tempVideoPath}`;
    
    try {
      require('child_process').execSync(ffmpegCmd);
      console.log('Created temporary video from image:', tempVideoPath);
    } catch (ffmpegError) {
      console.error('Error creating temporary video from image:', ffmpegError);
      throw new Error('Failed to create video from image using FFmpeg');
    }
    
    // Now extend this temporary video using the Fal AI LTX model
    return await extendVideo(
      tempVideoPath,
      enhancedPrompt,
      {
        aspectRatio: falAspectRatio,
        negativePrompt: options.negativePrompt,
        startFrameNum: 0 // Start from the beginning of our static video
      }
    );
  } catch (error) {
    console.error('Error generating video from image with Fal AI LTX:', error);
    throw new Error(`Failed to generate video from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}