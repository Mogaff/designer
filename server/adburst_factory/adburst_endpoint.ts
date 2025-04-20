/**
 * AdBurst Factory Endpoint
 * 
 * This file contains the Express endpoint for the AdBurst Factory feature,
 * which processes uploaded images and generates video ads using AI services.
 */

import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import {
  generateAd,
  generateVideo,
  generateScript,
  generateAudio,
  combineVideoAndAudio,
  addWatermark,
  saveUploadedFiles
} from './adburst_utils';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 3 // Maximum 3 files
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware to handle file uploads
const uploadMiddleware = upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 }
]);

/**
 * Render the AdBurst Factory form page
 */
export function renderAdBurstForm(req: Request, res: Response) {
  const formPath = path.join(__dirname, 'templates', 'adburst_form.html');
  
  fs.readFile(formPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading AdBurst form template:', err);
      return res.status(500).send('Error loading form');
    }
    
    res.send(data);
  });
}

/**
 * Process AdBurst Factory form submission
 */
export async function processAdBurst(req: Request, res: Response) {
  try {
    // Extract form data
    const { productName, productDescription, targetAudience } = req.body;
    
    if (!productName) {
      return res.status(400).json({ message: 'Product name is required' });
    }
    
    // Get uploaded files from multer
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || !files.image1 || !files.image2 || !files.image3) {
      return res.status(400).json({ message: 'Please upload exactly 3 image files' });
    }
    
    // Combine all images into a single array
    const imageFiles = [
      ...files.image1,
      ...files.image2,
      ...files.image3
    ];
    
    if (imageFiles.length !== 3) {
      return res.status(400).json({ message: 'Please upload exactly 3 image files' });
    }
    
    console.log(`Processing AdBurst request for product: ${productName}`);
    
    // Generate ad using our utility functions
    const options = {
      imageFiles,
      productName,
      productDescription,
      targetAudience
    };
    
    // For a real implementation, we would use the generateAd function
    // that orchestrates the entire process
    
    // Step 1: Generate script with GPT-4o
    const script = await generateScript({
      productName,
      productDescription,
      targetAudience
    });
    
    // Step 2: Generate audio from script using ElevenLabs
    const audioPath = await generateAudio({ script });
    
    // Step 3: Generate video from images using Gemini Veo 2
    const videoPath = await generateVideo(options);
    
    // Step 4: Combine video and audio
    const combinedVideoPath = await combineVideoAndAudio(videoPath, audioPath);
    
    // Step 5: Add watermark
    const finalVideoPath = await addWatermark(combinedVideoPath);
    
    // In a real implementation, we would store the video in a CDN or file storage
    // and return the URL. For this prototype, we'll create a route to serve the video.
    
    // Create a unique video ID (using the filename)
    const videoId = path.basename(finalVideoPath, '.mp4');
    
    // Return the response with video info
    return res.status(200).json({
      success: true,
      videoUrl: `/api/adburst/video/${videoId}`,
      script: script,
      message: 'Ad generated successfully'
    });
  } catch (error) {
    console.error('Error processing AdBurst request:', error);
    return res.status(500).json({
      success: false,
      message: `Ad generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}

/**
 * Serve a generated video file
 */
export function serveGeneratedVideo(req: Request, res: Response) {
  const { videoId } = req.params;
  
  if (!videoId) {
    return res.status(400).json({ message: 'Video ID is required' });
  }
  
  // In a real implementation, we would look up the video in a database
  // or verify its existence in a storage service
  
  // For this prototype, we'll assume the video ID is the filename
  const videoPath = path.join(process.cwd(), 'temp', `${videoId}.mp4`);
  
  // Check if the file exists
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ message: 'Video not found' });
  }
  
  // Set appropriate headers
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="ad-${videoId}.mp4"`);
  
  // Stream the file to the response
  const fileStream = fs.createReadStream(videoPath);
  fileStream.pipe(res);
}

/**
 * Register AdBurst routes with Express
 */
export function registerAdBurstRoutes(app: any) {
  // Serve the AdBurst form page
  app.get('/adburst', renderAdBurstForm);
  
  // Process form submission
  app.post('/api/adburst', (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 10MB' });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: 'Too many files. Maximum is 3 images' });
          }
        }
        return res.status(400).json({ message: err.message });
      }
      
      // Continue with request processing
      processAdBurst(req, res).catch((error) => next(error));
    });
  });
  
  // Serve generated videos
  app.get('/api/adburst/video/:videoId', serveGeneratedVideo);
  
  console.log('AdBurst Factory routes registered');
}

/**
 * Create required directories
 */
export function initAdBurstFactory() {
  const tempDir = path.join(process.cwd(), 'temp');
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('Created temp directory for AdBurst Factory');
  }
}