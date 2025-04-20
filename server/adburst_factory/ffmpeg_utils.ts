/**
 * FFmpeg Utilities for AdBurst Factory
 * Handles video processing tasks including:
 * - Merging video and audio
 * - Adding watermarks
 * - Format conversion
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../vite';

/**
 * Combine video and audio files into a single video with watermark
 * 
 * @param videoPath Path to the input video file
 * @param audioPath Path to the input audio file
 * @param watermarkPath Path to the watermark image (optional)
 * @returns Path to the combined output video file
 */
export async function combineVideoAudio(
  videoPath: string, 
  audioPath: string, 
  watermarkPath?: string
): Promise<string> {
  console.log('Combining video and audio with FFmpeg...');
  console.log(`Video: ${videoPath}`);
  console.log(`Audio: ${audioPath}`);
  console.log(`Watermark: ${watermarkPath || 'None'}`);
  
  try {
    // Prepare the output directory
    const outputDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFilename = `adburst-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFilename);
    
    // Execute the actual FFmpeg command
    
    // Build the FFmpeg command
    let ffmpegCommand = '';
    
    if (watermarkPath) {
      // Command to combine video, audio, and add watermark
      ffmpegCommand = `ffmpeg -i "${videoPath}" -i "${audioPath}" -i "${watermarkPath}" ` +
                    `-filter_complex "[0:v][2:v]overlay=W-w-10:H-h-10[outv]" ` +
                    `-map "[outv]" -map 1:a -c:v libx264 -c:a aac -shortest "${outputPath}"`;
    } else {
      // Command to combine just video and audio
      ffmpegCommand = `ffmpeg -i "${videoPath}" -i "${audioPath}" ` +
                    `-c:v copy -c:a aac -shortest "${outputPath}"`;
    }
    
    // Log the command we're executing
    console.log(`Executing FFmpeg command: ${ffmpegCommand}`);
    
    // Execute the command
    return new Promise<string>((resolve, reject) => {
      exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`FFmpeg error: ${error.message}`);
          reject(new Error(`FFmpeg failed: ${error.message}`));
          return;
        }
        
        if (stderr) {
          console.log(`FFmpeg stderr: ${stderr}`);
        }
        
        console.log(`FFmpeg completed successfully: ${outputPath}`);
        resolve(outputFilename);
      });
    });
  } catch (error) {
    console.error('Error combining video and audio:', error);
    throw new Error(`Failed to combine video and audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}