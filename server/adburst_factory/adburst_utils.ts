/**
 * AdBurst Factory Utilities
 * 
 * This file contains utility functions for the AdBurst Factory feature,
 * which generates 8-second vertical video ads from product still images
 * using Gemini Veo 2, GPT-4o, and ElevenLabs.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Define types
interface GenerateVideoOptions {
  imageFiles: Express.Multer.File[];
  productName: string;
  productDescription?: string;
  targetAudience?: string;
}

interface GenerateScriptOptions {
  productName: string;
  productDescription?: string;
  targetAudience?: string;
}

interface GenerateAudioOptions {
  script: string;
  voiceId?: string;
}

// Define path constants
const TEMP_DIR = path.join(process.cwd(), 'temp');

/**
 * Ensures the temporary directory exists
 */
export function ensureTempDir(): string {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  return TEMP_DIR;
}

/**
 * Generates a unique temporary file path
 */
export function generateTempFilePath(extension: string): string {
  return path.join(ensureTempDir(), `${uuidv4()}.${extension}`);
}

/**
 * Saves uploaded files to temporary directory
 * @param files - Array of uploaded files
 * @returns Array of file paths
 */
export function saveUploadedFiles(files: Express.Multer.File[]): string[] {
  ensureTempDir();
  
  return files.map(file => {
    const tempPath = generateTempFilePath(file.originalname.split('.').pop() || 'jpg');
    fs.writeFileSync(tempPath, file.buffer);
    return tempPath;
  });
}

/**
 * Generates a video using Gemini Veo 2 API
 * @param options - Options for video generation
 * @returns Path to generated video file
 */
export async function generateVideo(options: GenerateVideoOptions): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  
  console.log('Generating video with Gemini Veo 2...');
  
  // Save uploaded images to temp directory
  const imagePaths = saveUploadedFiles(options.imageFiles);
  
  // Prepare request to Gemini Veo 2
  const imageBase64Array = imagePaths.map(imagePath => {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  });
  
  try {
    // Create a prompt for Gemini that describes what we want
    const prompt = `Create an engaging 8-second vertical advertisement video using these product images. 
      The product name is: ${options.productName}.
      ${options.productDescription ? `Product description: ${options.productDescription}` : ''}
      ${options.targetAudience ? `Target audience: ${options.targetAudience}` : ''}
      Create a visually appealing video with smooth transitions between images.
      The video should be in 9:16 aspect ratio optimized for mobile viewing.`;
    
    // Call Gemini Veo 2 API (using Gemini API)
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-vision:generateContent',
      {
        contents: [{
          parts: [
            { text: prompt },
            ...imageBase64Array.map(base64 => ({
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64
              }
            }))
          ]
        }],
        generation_config: {
          temperature: 0.4,
          top_p: 0.95,
          top_k: 40,
          max_output_tokens: 2048,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        }
      }
    );
    
    // Note: Gemini Veo 2 doesn't actually generate video directly in this API.
    // In a real integration, we would need to use a different endpoint or service.
    // For now, we're simulating this step.
    
    console.log('Gemini API response received, processing video...');
    
    // For demonstration, we'll return a placeholder path
    // In a real implementation, we'd extract video URL or data from the response
    const videoPath = generateTempFilePath('mp4');
    
    // Clean up temp image files
    imagePaths.forEach(imagePath => {
      try {
        fs.unlinkSync(imagePath);
      } catch (err) {
        console.error(`Error deleting temp file ${imagePath}:`, err);
      }
    });
    
    return videoPath;
  } catch (error) {
    console.error('Error generating video with Gemini Veo 2:', error);
    throw new Error(`Failed to generate video: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generates a script for the ad using GPT-4o
 * @param options - Options for script generation
 * @returns Generated script text
 */
export async function generateScript(options: GenerateScriptOptions): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  console.log('Generating script with GPT-4o...');
  
  try {
    // Create prompt for GPT-4o
    const prompt = `Write a brief, engaging 8-second advertisement script for a ${options.productName}.
      ${options.productDescription ? `Product description: ${options.productDescription}` : ''}
      ${options.targetAudience ? `Target audience: ${options.targetAudience}` : ''}
      
      The script should:
      1. Be exactly 30-40 words (appropriate for an 8-second video)
      2. Have a compelling hook
      3. Include a clear call-to-action
      4. Highlight a key benefit
      5. Be conversational and natural-sounding
      
      Return ONLY the script text, nothing else.`;
    
    // Call OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert ad copywriter who creates concise, compelling scripts for short-form video ads.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );
    
    const scriptText = response.data.choices[0].message.content.trim();
    console.log('Generated script:', scriptText);
    
    return scriptText;
  } catch (error) {
    console.error('Error generating script with GPT-4o:', error);
    throw new Error(`Failed to generate script: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generates audio from script using ElevenLabs TTS
 * @param options - Options for audio generation
 * @returns Path to generated audio file
 */
export async function generateAudio(options: GenerateAudioOptions): Promise<string> {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
  }
  
  console.log('Generating audio with ElevenLabs...');
  
  try {
    // Default voice ID if not provided
    const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default voice: Rachel
    
    // Call ElevenLabs API
    const response = await axios({
      method: 'post',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      data: {
        text: options.script,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });
    
    // Save audio file
    const audioPath = generateTempFilePath('mp3');
    fs.writeFileSync(audioPath, response.data);
    
    return audioPath;
  } catch (error) {
    console.error('Error generating audio with ElevenLabs:', error);
    throw new Error(`Failed to generate audio: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Combines video and audio using FFmpeg
 * @param videoPath - Path to video file
 * @param audioPath - Path to audio file
 * @param outputPath - Optional custom output path
 * @returns Path to combined video file
 */
export async function combineVideoAndAudio(
  videoPath: string, 
  audioPath: string, 
  outputPath?: string
): Promise<string> {
  console.log('Combining video and audio with FFmpeg...');
  
  // Generate output path if not provided
  const finalOutputPath = outputPath || generateTempFilePath('mp4');
  
  return new Promise((resolve, reject) => {
    // Use FFmpeg to combine video and audio
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-i', audioPath,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-shortest',
      finalOutputPath
    ]);
    
    ffmpeg.stderr.on('data', (data) => {
      console.log(`FFmpeg: ${data}`);
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        // Clean up temporary files
        try {
          fs.unlinkSync(videoPath);
          fs.unlinkSync(audioPath);
        } catch (err) {
          console.error('Error deleting temporary files:', err);
        }
        
        resolve(finalOutputPath);
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });
  });
}

/**
 * Adds watermark to video using FFmpeg
 * @param videoPath - Path to video file
 * @param outputPath - Optional custom output path
 * @returns Path to watermarked video
 */
export async function addWatermark(videoPath: string, outputPath?: string): Promise<string> {
  console.log('Adding watermark to video...');
  
  // Generate output path if not provided
  const finalOutputPath = outputPath || generateTempFilePath('mp4');
  
  // Create a simple text watermark
  // In a production environment, you would use an actual image watermark
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-vf', "drawtext=text='AdBurst Factory':fontcolor=white:fontsize=24:alpha=0.5:x=10:y=10",
      '-c:a', 'copy',
      finalOutputPath
    ]);
    
    ffmpeg.stderr.on('data', (data) => {
      console.log(`FFmpeg: ${data}`);
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        // Clean up input file
        try {
          fs.unlinkSync(videoPath);
        } catch (err) {
          console.error('Error deleting input file:', err);
        }
        
        resolve(finalOutputPath);
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`));
      }
    });
  });
}

/**
 * Uploads video to Buffer using Buffer API
 * @param videoPath - Path to video file
 * @param options - Upload options
 * @returns Buffer API response data
 */
export async function uploadToBuffer(
  videoPath: string, 
  options: { 
    accessToken: string; 
    text?: string; 
    profileIds?: string[]; 
  }
): Promise<any> {
  console.log('Uploading video to Buffer...');
  
  try {
    // Read video file
    const videoBuffer = fs.readFileSync(videoPath);
    const videoBase64 = videoBuffer.toString('base64');
    
    // Call Buffer API
    const response = await axios.post(
      'https://api.bufferapp.com/1/updates/create.json',
      {
        access_token: options.accessToken,
        text: options.text || 'Check out our latest product!',
        profile_ids: options.profileIds || [],
        media: {
          video: videoBase64,
          thumbnail: videoBase64 // In a real implementation, you would generate a thumbnail
        },
        scheduled_at: new Date(Date.now() + 3600000).toISOString() // Schedule 1 hour from now
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error uploading to Buffer:', error);
    throw new Error(`Failed to upload to Buffer: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Main function to orchestrate the entire ad generation process
 * @param options - Options for ad generation
 * @returns Path to final video file
 */
export async function generateAd(options: GenerateVideoOptions): Promise<string> {
  try {
    // Step 1: Generate video from images
    const videoPath = await generateVideo(options);
    
    // Step 2: Generate script
    const script = await generateScript({
      productName: options.productName,
      productDescription: options.productDescription,
      targetAudience: options.targetAudience
    });
    
    // Step 3: Generate audio from script
    const audioPath = await generateAudio({ script });
    
    // Step 4: Combine video and audio
    const combinedVideoPath = await combineVideoAndAudio(videoPath, audioPath);
    
    // Step 5: Add watermark
    const watermarkedVideoPath = await addWatermark(combinedVideoPath);
    
    // Return the path to the final video
    return watermarkedVideoPath;
  } catch (error) {
    console.error('Error in ad generation process:', error);
    throw new Error(`Ad generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}