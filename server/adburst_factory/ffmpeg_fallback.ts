/**
 * FFmpeg Fallback for AdBurst Factory
 * Creates a simple video animation from still images when Veo 2 API is unavailable
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a simple video animation from a still image for fallback
 * 
 * @param imagePaths Array of paths to still images
 * @returns Path to the generated video file
 */
export async function createVideoFromImages(imagePaths: string[]): Promise<string> {
  console.log('Creating video from still images (fallback)...');
  
  try {
    const outputDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Create a temporary directory for image sequence
    const sequenceDir = path.join(outputDir, `seq-${uuidv4()}`);
    fs.mkdirSync(sequenceDir, { recursive: true });
    
    // Create temp file list for FFmpeg
    const fileListPath = path.join(sequenceDir, 'filelist.txt');
    let fileListContent = '';
    
    // Prepare each image for the sequence
    const preparedImages: string[] = [];
    
    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      
      // Create multiple frames for each image to make the video longer
      const framesPerImage = 60; // 2 seconds at 30fps
      
      for (let j = 0; j < framesPerImage; j++) {
        const frameNumber = (i * framesPerImage) + j;
        const outputFrame = path.join(sequenceDir, `frame_${frameNumber.toString().padStart(6, '0')}.jpg`);
        
        // Copy the original image multiple times
        fs.copyFileSync(imagePath, outputFrame);
        preparedImages.push(outputFrame);
        
        // Add to file list with duration
        fileListContent += `file '${outputFrame}'\nduration 0.033\n`; // ~30fps
      }
    }
    
    // Write the file list
    fs.writeFileSync(fileListPath, fileListContent);
    
    // Define output path
    const outputPath = path.join(outputDir, `fallback-${Date.now()}.mp4`);
    
    // Build FFmpeg command for creating video with pan/zoom effects
    const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${fileListPath}" -c:v libx264 -pix_fmt yuv420p -r 30 -vf "scale=1080:1920,zoompan=z='min(zoom+0.001,1.5)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920" "${outputPath}"`;
    
    // Execute FFmpeg command
    console.log(`Executing: ${ffmpegCmd}`);
    
    return new Promise<string>((resolve, reject) => {
      exec(ffmpegCmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`FFmpeg error: ${error.message}`);
          reject(new Error(`FFmpeg failed: ${error.message}`));
          return;
        }
        
        // Clean up sequence directory
        for (const img of preparedImages) {
          try { fs.unlinkSync(img); } catch (e) { /* ignore */ }
        }
        try { fs.unlinkSync(fileListPath); } catch (e) { /* ignore */ }
        try { fs.rmdirSync(sequenceDir); } catch (e) { /* ignore */ }
        
        console.log(`Fallback video created: ${outputPath}`);
        resolve(outputPath);
      });
    });
  } catch (error) {
    console.error('Error creating fallback video:', error);
    throw new Error(`Failed to create fallback video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}