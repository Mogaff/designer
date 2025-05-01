/**
 * AdBurst Factory Video Processor
 * Handles multi-image video generation, processing and concatenation
 * 
 * This module implements the functionality to:
 * 1. Process multiple images into video segments
 * 2. Calculate optimal segment durations based on image count
 * 3. Concatenate videos with transitions
 * 4. Add audio and finalize the output
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import util from 'util';
import { imageToVideo } from './fal_i2v_api';

// Convert exec to Promise-based
const execPromise = util.promisify(exec);

// Configuration options
const DEFAULT_VIDEO_DURATION = 20; // Total duration in seconds for output video
const MIN_SEGMENT_DURATION = 4; // Minimum duration per segment in seconds
const MAX_SEGMENT_DURATION = 8; // Maximum duration per segment in seconds
const TRANSITION_DURATION = 0.5; // Transition duration in seconds
const DEFAULT_FRAME_RATE = 25; // Default frame rate

// Types
interface VideoSegment {
  path: string;
  duration: number;      // Target duration for this segment
  actualDuration?: number; // Actual duration of the video file (typically 4 seconds for Fal AI)
  order: number;
  loopCount?: number;    // Number of times to loop the segment to reach target duration
  transitionIn?: string;
  transitionOut?: string;
}

interface VideoGenerationOptions {
  productName: string;
  productDescription?: string;
  targetAudience?: string;
  totalDuration?: number;
  outputWidth?: number;
  outputHeight?: number;
  framerateOutput?: number;
  includeTransitions?: boolean;
}

/**
 * Calculate the optimal duration for each segment based on image count and total duration
 */
export function calculateSegmentDurations(
  imageCount: number, 
  totalDuration: number = DEFAULT_VIDEO_DURATION,
  transitionDuration: number = TRANSITION_DURATION
): number[] {
  // Make sure we have at least one image
  if (imageCount <= 0) {
    throw new Error('At least one image is required to calculate segment durations');
  }
  
  // Calculate total transition time (n-1 transitions)
  const totalTransitionTime = (imageCount - 1) * transitionDuration;
  
  // Available time for actual content
  const availableContentTime = totalDuration - totalTransitionTime;
  
  // Base segment duration
  const baseDuration = availableContentTime / imageCount;
  
  // Create array with even durations
  return Array(imageCount).fill(baseDuration);
}

/**
 * Generate a custom prompt for each segment based on its position
 */
export function generateSegmentPrompt(
  index: number, 
  totalCount: number, 
  options: {
    productName: string;
    productDescription?: string;
    targetAudience?: string;
  }
): string {
  const { productName, productDescription, targetAudience } = options;
  const position = index + 1;
  
  // Calculate the segment's relative position (beginning, middle, end)
  const isFirst = position === 1;
  const isLast = position === totalCount;
  const isMiddle = !isFirst && !isLast;
  
  // Base prompt parts
  let basePrompt = `Professional ${productName} video advertisement`;
  
  if (productDescription) {
    basePrompt += ` showcasing ${productDescription}`;
  }
  
  if (targetAudience) {
    basePrompt += ` for ${targetAudience}`;
  }
  
  // Position-specific prompts
  let positionPrompt = '';
  if (isFirst) {
    positionPrompt = `Opening segment with attention-grabbing introduction. Elegant zoom in and smooth camera movement focusing on main product features.`;
  } else if (isLast) {
    positionPrompt = `Final segment with strong call-to-action. Dynamic camera movement emphasizing product benefits and brand value. Cinematic closing shot.`;
  } else {
    // For middle segments, create varied prompts based on position
    const middlePosition = position - 1; // 1-based index for middle segments
    const totalMiddle = totalCount - 2; // Total middle segments
    
    if (middlePosition <= totalMiddle / 2) {
      positionPrompt = `Feature highlight segment showing product details with slow, professional camera pan. Reveal key benefit with smooth movement.`;
    } else {
      positionPrompt = `Product demonstration segment with elegant transitions and professional lighting. Show the product in use with premium camera work.`;
    }
  }
  
  // Visual style guidance
  const stylePrompt = `High-end commercial quality with cinematic color grading, premium lighting, and professional camera movement. 9:16 vertical format optimized for social media.`;
  
  // Combine all prompt elements
  return `${basePrompt}. ${positionPrompt} ${stylePrompt}`;
}

/**
 * Process an array of image paths into video segments
 * Modified to handle API limitations by looping segments if needed
 */
export async function processImagesToVideoSegments(
  imagePaths: string[],
  options: VideoGenerationOptions
): Promise<VideoSegment[]> {
  console.log(`Processing ${imagePaths.length} images into video segments...`);
  
  // Calculate required segment durations based on image count
  const durations = calculateSegmentDurations(
    imagePaths.length, 
    options.totalDuration || DEFAULT_VIDEO_DURATION
  );
  
  // Process each image to a video in parallel
  const processingPromises = imagePaths.map(async (imagePath, index) => {
    // Generate custom prompt for this segment
    const segmentPrompt = generateSegmentPrompt(index, imagePaths.length, {
      productName: options.productName,
      productDescription: options.productDescription,
      targetAudience: options.targetAudience
    });
    
    console.log(`Generating video segment ${index + 1}/${imagePaths.length} with prompt: "${segmentPrompt}"`);
    
    try {
      // Convert image to video using Fal AI - this creates a 4-second video
      const videoPath = await imageToVideo(
        imagePath,
        segmentPrompt,
        { aspectRatio: "9:16" }
      );
      
      console.log(`Video segment ${index + 1} generated: ${videoPath}`);
      
      // Calculate how many times we need to loop this segment to reach desired duration
      // Since Fal AI gives us a 4-second video
      const targetDuration = durations[index];
      const baseSegmentDuration = 4; // 4 seconds from Fal AI
      const loopCount = Math.ceil(targetDuration / baseSegmentDuration);
      
      console.log(`Segment ${index + 1} requires ${loopCount}x loop(s) to reach ${targetDuration} seconds`);
      
      // Create segment object with loop information
      return {
        path: videoPath,
        duration: targetDuration,
        actualDuration: baseSegmentDuration,
        order: index,
        loopCount: loopCount,
        transitionIn: index > 0 ? 'crossfade' : undefined,
        transitionOut: index < imagePaths.length - 1 ? 'crossfade' : undefined
      };
    } catch (error) {
      console.error(`Error generating video segment ${index + 1}:`, error);
      throw new Error(`Failed to generate video segment ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  // Wait for all video segments to be processed
  const segments = await Promise.all(processingPromises);
  console.log(`Successfully generated ${segments.length} video segments with appropriate loop counts`);
  
  return segments;
}

/**
 * Adjust video segment durations using FFmpeg
 * Modified to handle loop-based approach for longer segments
 */
export async function adjustSegmentDurations(
  segments: VideoSegment[]
): Promise<VideoSegment[]> {
  console.log(`Adjusting durations for ${segments.length} video segments...`);
  
  const adjustedSegments = await Promise.all(segments.map(async (segment, index) => {
    const outputPath = path.join(process.cwd(), 'temp', `adjusted-segment-${index}-${uuidv4()}.mp4`);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    try {
      // Get segment details
      const targetDuration = segment.duration;
      const loopCount = segment.loopCount || 1;
      const actualDuration = segment.actualDuration || 4; // Default to 4 seconds for Fal AI
      
      // If we need to loop the video multiple times to reach desired duration
      if (loopCount > 1) {
        console.log(`Creating ${loopCount}x loop of segment ${index + 1} to reach ${targetDuration}s duration`);
        
        // Create a temporary file for the loop list
        const loopListPath = path.join(process.cwd(), 'temp', `loop-list-${index}-${uuidv4()}.txt`);
        
        // Write the same file path multiple times to create a loop
        const loopContent = Array(loopCount).fill(`file '${segment.path.replace(/'/g, "'\\''")}'`).join('\n');
        fs.writeFileSync(loopListPath, loopContent);
        
        // Use FFmpeg's concat demuxer to loop the video
        const ffmpegCmd = `ffmpeg -f concat -safe 0 -i "${loopListPath}" -c copy "${outputPath}"`;
        
        console.log(`Executing FFmpeg loop command for segment ${index + 1}:`, ffmpegCmd);
        const { stdout, stderr } = await execPromise(ffmpegCmd);
        
        if (stderr) {
          console.log(`FFmpeg stderr for segment ${index + 1} loop:`, stderr);
        }
        
        // Clean up temporary loop list
        if (fs.existsSync(loopListPath)) {
          fs.unlinkSync(loopListPath);
        }
        
        console.log(`Created ${loopCount}x loop of segment ${index + 1}, saved to: ${outputPath}`);
      } 
      // For segments that are already the correct duration (or very close)
      else if (Math.abs(targetDuration - actualDuration) < 0.1) {
        fs.copyFileSync(segment.path, outputPath);
        console.log(`Segment ${index + 1} already has correct duration, copied to: ${outputPath}`);
      } 
      // For minor duration adjustments
      else {
        // Use setpts filter to adjust video duration by changing playback speed
        // For shorter videos, we slow down (setpts > 1)
        // For longer videos, we speed up (setpts < 1)
        const speedFactor = targetDuration / actualDuration;
        
        // Build FFmpeg command for duration adjustment
        const ffmpegCmd = `ffmpeg -i "${segment.path}" -filter_complex "[0:v]setpts=${speedFactor}*PTS[v]" -map "[v]" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;
        
        console.log(`Executing FFmpeg speed adjustment for segment ${index + 1}:`, ffmpegCmd);
        const { stdout, stderr } = await execPromise(ffmpegCmd);
        
        if (stderr) {
          console.log(`FFmpeg stderr for segment ${index + 1}:`, stderr);
        }
        
        console.log(`Adjusted segment ${index + 1} duration to ${targetDuration}s, saved to: ${outputPath}`);
      }
      
      // Return updated segment with new path and adjusted duration information
      return { 
        ...segment, 
        path: outputPath,
        actualDuration: targetDuration // Update the actual duration to match the target
      };
    } catch (error) {
      console.error(`Error adjusting duration for segment ${index + 1}:`, error);
      // If there's an error, return the original segment
      return segment;
    }
  }));
  
  return adjustedSegments;
}

/**
 * Concatenate multiple video segments with transitions
 */
export async function concatenateVideoSegments(
  segments: VideoSegment[],
  options: {
    outputPath?: string;
    frameRate?: number;
    width?: number;
    height?: number;
    includeTransitions?: boolean;
  } = {}
): Promise<string> {
  // Set default options
  const frameRate = options.frameRate || DEFAULT_FRAME_RATE;
  const outputPath = options.outputPath || path.join(process.cwd(), 'temp', `concatenated-${uuidv4()}.mp4`);
  const includeTransitions = options.includeTransitions !== undefined ? options.includeTransitions : true;
  
  console.log(`Concatenating ${segments.length} video segments${includeTransitions ? ' with transitions' : ''}...`);
  
  // Ensure segments are sorted by order
  const sortedSegments = [...segments].sort((a, b) => a.order - b.order);
  
  // Create a temporary file list for FFmpeg concat demuxer
  const concatFilePath = path.join(process.cwd(), 'temp', `concat-list-${uuidv4()}.txt`);
  
  // Prepare the filter complex command for transitions
  let filterComplex = '';
  let outputStreams: string[] = [];
  
  if (includeTransitions && segments.length > 1) {
    // Complex filter graph with crossfade transitions
    sortedSegments.forEach((segment, index) => {
      // Add input video stream
      filterComplex += `[${index}:v]setpts=PTS-STARTPTS,format=yuv420p[v${index}];`;
      
      if (index < sortedSegments.length - 1) {
        // Calculate transition frames
        const transitionFrames = Math.round(TRANSITION_DURATION * frameRate);
        
        // Add crossfade transition to next segment
        filterComplex += `[v${index}][v${index + 1}]xfade=transition=fade:duration=${TRANSITION_DURATION}:offset=${segment.duration - TRANSITION_DURATION}[v${index}out];`;
        
        outputStreams.push(`[v${index}out]`);
      } else {
        // Last segment doesn't have a transition out
        outputStreams.push(`[v${index}]`);
      }
    });
    
    // Concatenate all streams
    filterComplex += `${outputStreams.join('')}concat=n=${outputStreams.length}:v=1:a=0[outv]`;
  } else {
    // Simple concatenation without transitions
    fs.writeFileSync(concatFilePath, sortedSegments.map(segment => {
      return `file '${segment.path.replace(/'/g, "'\\''")}'`;
    }).join('\n'));
    
    console.log(`Created concat file list at ${concatFilePath}`);
  }
  
  try {
    let ffmpegCmd;
    
    if (includeTransitions && segments.length > 1) {
      // Build FFmpeg command with filter complex for transitions
      ffmpegCmd = `ffmpeg ${sortedSegments.map(segment => `-i "${segment.path}"`).join(' ')} -filter_complex "${filterComplex}" -map "[outv]" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;
    } else {
      // Simple concatenation using concat demuxer
      ffmpegCmd = `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath}"`;
    }
    
    console.log('Executing FFmpeg concatenation command:', ffmpegCmd);
    const { stdout, stderr } = await execPromise(ffmpegCmd);
    
    if (stderr) {
      console.log('FFmpeg stderr output:', stderr);
    }
    
    console.log(`Video segments concatenated successfully to: ${outputPath}`);
    
    // Clean up temporary concat file
    if (fs.existsSync(concatFilePath)) {
      fs.unlinkSync(concatFilePath);
    }
    
    return outputPath;
  } catch (error) {
    console.error('Error concatenating video segments:', error);
    throw new Error(`Failed to concatenate video segments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main function to process multiple images into a single video
 */
export async function createMultiImageVideo(
  imagePaths: string[],
  options: VideoGenerationOptions
): Promise<string> {
  console.log(`Creating multi-image video from ${imagePaths.length} images with options:`, options);
  
  try {
    // Step 1: Process images to individual video segments
    const segments = await processImagesToVideoSegments(imagePaths, options);
    
    // Step 2: Adjust each segment's duration
    const adjustedSegments = await adjustSegmentDurations(segments);
    
    // Step 3: Concatenate all segments with transitions
    const outputPath = await concatenateVideoSegments(adjustedSegments, {
      frameRate: options.framerateOutput,
      width: options.outputWidth,
      height: options.outputHeight,
      includeTransitions: options.includeTransitions
    });
    
    return outputPath;
  } catch (error) {
    console.error('Error creating multi-image video:', error);
    throw new Error(`Failed to create multi-image video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}