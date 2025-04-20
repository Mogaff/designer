/**
 * Buffer API Integration for AdBurst Factory
 * Handles automatic upload and scheduling of videos to social media platforms
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// For a real implementation, you would need to get these from environment variables
// or through OAuth authorization

// Mock Buffer API configuration (for illustration purposes)
const BUFFER_API_BASE_URL = 'https://api.bufferapp.com/1';
const BUFFER_ACCESS_TOKEN = process.env.BUFFER_ACCESS_TOKEN || '';

/**
 * Upload a video to Buffer for scheduled posting to social media
 * 
 * @param videoPath Path to the video file to upload
 * @param caption Caption for the social media post
 * @param platforms Array of platform IDs to post to (e.g., 'instagram', 'tiktok')
 * @returns Buffer upload/schedule response data
 */
export async function uploadToBuffer(
  videoPath: string,
  caption: string,
  platforms: string[] = ['instagram', 'tiktok']
): Promise<any> {
  console.log('Uploading video to Buffer for social media scheduling...');
  console.log(`Video: ${videoPath}`);
  console.log(`Caption: ${caption}`);
  console.log(`Platforms: ${platforms.join(', ')}`);
  
  try {
    // Make the actual Buffer API call
    // Read the video file as a binary stream
    const videoBuffer = fs.readFileSync(videoPath);
    
    // Create data for the Buffer API using standard form encoding
    const scheduleTime = new Date(Date.now() + 3600000); // 1 hour from now
    const formData = {
      access_token: BUFFER_ACCESS_TOKEN,
      media: videoBuffer.toString('base64'),
      media_type: 'video/mp4',
      text: caption,
      scheduled_at: scheduleTime.toISOString(),
      profile_ids: platforms.join(',')
    };
    
    // Make the API request to Buffer
    console.log('Uploading to Buffer API with:', { 
      caption,
      platforms,
      scheduledAt: scheduleTime.toISOString()
    });
    
    try {
      // Make the actual API call
      const response = await axios.post(
        `${BUFFER_API_BASE_URL}/updates/create.json`,
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${BUFFER_ACCESS_TOKEN}`
          }
        }
      );
      
      // Return the actual Buffer API response
      console.log('Buffer upload response:', response.data);
      return response.data;
    } catch (apiError: any) {
      console.error('Error from Buffer API:', apiError.response?.data || apiError.message);
      
      // If API call fails, return an error response to be handled by the caller
      throw new Error(`Buffer API error: ${apiError.response?.data?.message || apiError.message}`);
    }
  } catch (error) {
    console.error('Error uploading to Buffer:', error);
    throw new Error(`Failed to upload to Buffer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}