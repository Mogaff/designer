import { Request, Response, Router } from 'express';
import multer from 'multer';
import { isAuthenticated } from '../auth';
import { log } from '../vite';
import {
  handleImageUploads,
  generateVideoWithGemini,
  generateVoiceOverText,
  generateVoiceOver,
  combineVideoAndAudio,
  uploadToBuffer,
  cleanupTempFiles,
  APIResponse
} from './adburst_utils';

// Configure multer storage for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
    files: 3 // Maximum 3 files
  }
});

// Create express router
const adburstRouter = Router();

/**
 * AdBurst Factory API Endpoint
 * Processes up to 3 product images to create an 8-second vertical video ad
 * with AI-generated voice-over
 */
adburstRouter.post('/api/adburst', isAuthenticated, upload.array('images', 3), async (req: Request, res: Response) => {
  // Track files to clean up later
  const filesToCleanup: string[] = [];
  
  try {
    log('AdBurst Factory API endpoint called', 'adburst');
    
    // Check if exactly 3 images were uploaded
    if (!req.files || (req.files as Express.Multer.File[]).length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Please upload exactly 3 product images'
      } as APIResponse);
    }
    
    // Extract request parameters
    const { prompt, callToAction, aspectRatio } = req.body;
    
    // Step 1: Save uploaded images to temporary directory
    const imagePaths = handleImageUploads(req);
    filesToCleanup.push(...imagePaths);
    
    // Step 2: Generate video from images using Gemini Veo 2
    log('Generating video using Gemini Veo 2...', 'adburst');
    const videoPath = await generateVideoWithGemini(imagePaths, { 
      prompt, 
      aspectRatio: aspectRatio || 'vertical' 
    });
    filesToCleanup.push(videoPath);
    
    // Step 3: Generate voice-over text using GPT-4o
    log('Generating voice-over text using GPT-4o...', 'adburst');
    const voiceOverText = await generateVoiceOverText(prompt);
    
    // Step 4: Convert voice-over text to speech using ElevenLabs
    log('Converting text to speech using ElevenLabs...', 'adburst');
    const audioPath = await generateVoiceOver(voiceOverText);
    filesToCleanup.push(audioPath);
    
    // Step 5: Combine video and audio using FFmpeg
    log('Combining video and audio using FFmpeg...', 'adburst');
    const finalVideoPath = await combineVideoAndAudio(videoPath, audioPath);
    filesToCleanup.push(finalVideoPath);
    
    // Step 6: Upload to Buffer
    log('Uploading to Buffer...', 'adburst');
    const bufferUrl = await uploadToBuffer(finalVideoPath);
    
    // Return success response with download link
    return res.status(200).json({
      success: true,
      message: 'Ad video successfully generated',
      data: {
        downloadUrl: `/adburst/download/${finalVideoPath.split('/').pop()}`,
        bufferUrl
      }
    } as APIResponse);
    
  } catch (error) {
    log(`Error in AdBurst API: ${error}`, 'adburst');
    // Return error response
    return res.status(500).json({
      success: false,
      message: 'Failed to generate ad video',
      error: error instanceof Error ? error.message : String(error)
    } as APIResponse);
  } finally {
    // Clean up temporary files
    cleanupTempFiles(filesToCleanup);
  }
});

/**
 * Endpoint to download the generated video
 */
adburstRouter.get('/adburst/download/:filename', isAuthenticated, (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = `${__dirname}/../../temp/${filename}`;
    
    if (!filename || !filename.endsWith('.mp4')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file request'
      } as APIResponse);
    }
    
    // Check if file exists
    if (!require('fs').existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      } as APIResponse);
    }
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'video/mp4');
    
    // Stream the file to the client
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    log(`Error in download endpoint: ${error}`, 'adburst');
    return res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error instanceof Error ? error.message : String(error)
    } as APIResponse);
  }
});

/**
 * Simple health check endpoint for the AdBurst Factory
 */
adburstRouter.get('/adburst/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'AdBurst Factory is running'
  } as APIResponse);
});

export default adburstRouter;