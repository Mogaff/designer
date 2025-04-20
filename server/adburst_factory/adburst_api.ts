/**
 * AdBurst Factory API
 * Direct implementation of the AdBurst Factory API for generating vertical video ads
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';

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

// Initialize Anthropic client
// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Import all our API integrations
import { imageToVideo } from './veo_api';
import { generateAdScript } from './openai_api';
import { textToSpeech } from './elevenlabs_api';
import { combineVideoAudio } from './ffmpeg_utils';
import { uploadToBuffer } from './buffer_api';

/**
 * Generate script using GPT-4o or Claude 3.7
 * Primary: GPT-4o for script generation
 * Fallback: Claude 3.7 if OpenAI fails
 */
async function generateScript(options: {
  productName: string;
  productDescription?: string;
  targetAudience?: string;
}): Promise<string> {
  try {
    // Try GPT-4o first (primary option)
    console.log('Generating script with GPT-4o...');
    return await generateAdScript(options);
  } catch (error) {
    console.error('Error with GPT-4o, falling back to Claude 3.7:', error);
    
    // Fallback to Claude 3.7
    try {
      console.log('Generating script with Claude 3.7 (fallback)...');
      
      const systemPrompt = `You are an expert marketing copywriter. Create short, compelling ad copy for video advertisements.`;
      
      const userPrompt = `Write a concise, engaging 8-second advertisement script (about 30-40 words) for:
        
        Product: ${options.productName}
        ${options.productDescription ? `Description: ${options.productDescription}` : ''}
        ${options.targetAudience ? `Target Audience: ${options.targetAudience}` : ''}
        
        The script should:
        - Start with a compelling hook
        - Clearly communicate the main benefit
        - Include a call-to-action
        - Be exactly 30-40 words
        
        Return ONLY the script text, nothing else.`;
      
      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        system: systemPrompt,
        max_tokens: 1024,
        messages: [{ role: 'user', content: userPrompt }],
      });
  
      // Get the response text
      const content = response.content[0];
      if (content.type === 'text') {
        const script = content.text.trim();
        console.log('Generated script with Claude 3.7:', script);
        return script;
      } else {
        throw new Error('Unexpected response format from Claude');
      }
    } catch (claudeError) {
      console.error('Error generating script with Claude:', claudeError);
      
      // No fallback, just throw the error to stop the process
      throw new Error('Both GPT-4o and Claude 3.7 failed to generate a script. Check API keys and try again.');
    }
  }
}

/**
 * Save uploaded files to temp directory
 */
function saveUploadedFiles(files: Express.Multer.File[]): string[] {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return files.map(file => {
    const filename = `${uuidv4()}-${file.originalname}`;
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, file.buffer);
    return filePath;
  });
}

/**
 * Process AdBurst Factory request
 * Follows the complete workflow:
 * 1. Upload images
 * 2. Generate video from primary image (Veo 2)
 * 3. Generate script (GPT-4o/Claude)
 * 4. Generate voiceover (ElevenLabs)
 * 5. Combine video and audio (FFmpeg)
 * 6. Upload to social media (Buffer)
 */
export async function processAdBurstRequest(req: Request, res: Response) {
  try {
    // Step 1: Extract form data
    const { productName, productDescription, targetAudience } = req.body;
    
    console.log('AdBurst request data:', { productName, productDescription, targetAudience });
    
    if (!productName) {
      return res.status(400).json({ 
        success: false,
        message: 'Product name is required' 
      });
    }
    
    // Get uploaded files from multer
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || !files.image1 || !files.image2 || !files.image3) {
      return res.status(400).json({ 
        success: false,
        message: 'Please upload exactly 3 image files (image1, image2, image3)' 
      });
    }
    
    // Combine all images into a single array
    const imageFiles = [
      ...files.image1,
      ...files.image2,
      ...files.image3
    ];
    
    if (imageFiles.length !== 3) {
      return res.status(400).json({ 
        success: false,
        message: 'Please upload exactly 3 image files' 
      });
    }
    
    console.log(`Processing AdBurst for ${productName} with ${imageFiles.length} images`);
    
    // Save images to temporary storage
    const imagePaths = saveUploadedFiles(imageFiles);
    console.log('Images saved to:', imagePaths);
    
    // PARALLEL PROCESSING: Start multiple tasks simultaneously for efficiency
    
    // Step 2: Generate video from primary image using Veo 2
    console.log('Starting video generation with Veo 2...');
    const videoPromise = imageToVideo(imagePaths[0]); // Use the first image for video generation
    
    // Step 3: Generate script using GPT-4o with Claude fallback
    console.log('Starting script generation...');
    const scriptPromise = generateScript({
      productName,
      productDescription,
      targetAudience
    });
    
    // Wait for both tasks to complete
    const [rawVideoPath, script] = await Promise.all([videoPromise, scriptPromise]);
    console.log('Video generation complete:', rawVideoPath);
    console.log('Script generation complete:', script);
    
    // Step 4: Generate voiceover from script using ElevenLabs
    console.log('Starting voiceover generation with ElevenLabs...');
    const audioPath = await textToSpeech(script);
    console.log('Voiceover generation complete:', audioPath);
    
    // Step 5: Combine video with voiceover using FFmpeg
    // Optional: Add a watermark if available
    console.log('Combining video and audio...');
    const watermarkPath = path.join(process.cwd(), 'temp', 'watermark.png');
    const hasWatermark = fs.existsSync(watermarkPath);
    
    const outputFileName = await combineVideoAudio(
      rawVideoPath, 
      audioPath, 
      hasWatermark ? watermarkPath : undefined
    );
    console.log('Video processing complete:', outputFileName);
    
    // Step 6: Upload to Buffer for social media distribution (optional)
    let bufferData = null;
    try {
      console.log('Uploading to Buffer for social media...');
      bufferData = await uploadToBuffer(
        path.join(process.cwd(), 'temp', outputFileName),
        `${productName} - ${script.split('.')[0]}.`, // Use first sentence as caption
        ['instagram', 'tiktok']
      );
      console.log('Buffer upload complete:', bufferData);
    } catch (bufferError) {
      console.error('Buffer upload failed (optional step):', bufferError);
      // Continue without Buffer - it's optional
    }
    
    // Provide a video URL pointing to our API
    const videoUrl = `/api/adburst/video/${outputFileName}`;
    
    // Step 7: Return success response with all data
    return res.status(200).json({
      success: true,
      videoUrl,
      script,
      message: 'Ad generated successfully with full AdBurst Factory workflow',
      processingTime: '~90 seconds', // Approximate time taken
      socialMedia: bufferData || 'Not available',
      // Include metadata for front-end display
      metadata: {
        productName,
        generatedAt: new Date().toISOString(),
        videoLength: '8 seconds',
        aspectRatio: '9:16 (vertical)',
      }
    });
  } catch (error) {
    console.error('Error processing AdBurst request:', error);
    return res.status(500).json({
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}

/**
 * Serve a generated video file
 */
export function serveGeneratedVideo(req: Request, res: Response) {
  const { videoId } = req.params;
  
  if (!videoId) {
    return res.status(400).json({ 
      success: false,
      message: 'Video ID is required' 
    });
  }
  
  // Video path based on filename
  const videoPath = path.join(process.cwd(), 'temp', videoId);
  
  // Check if file exists
  if (!fs.existsSync(videoPath)) {
    console.error(`Video file not found: ${videoPath}`);
    return res.status(404).json({ 
      success: false,
      message: 'Video not found' 
    });
  }
  
  // Set appropriate headers for video
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="adburst-ad.mp4"`);
  
  // Stream the video file to the response
  const fileStream = fs.createReadStream(videoPath);
  fileStream.pipe(res);
}

/**
 * Register AdBurst API routes
 */
export function registerAdBurstApiRoutes(app: any) {
  // Process form submission
  app.post('/api/adburst', (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, (err: any) => {
      if (err) {
        console.error('Error uploading files:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              success: false,
              message: 'File too large. Maximum size is 10MB' 
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
              success: false,
              message: 'Too many files. Maximum is 3 images' 
            });
          }
        }
        return res.status(400).json({ 
          success: false,
          message: err.message 
        });
      }
      
      // Continue with request processing
      processAdBurstRequest(req, res).catch(error => {
        console.error('Unhandled error in processAdBurstRequest:', error);
        next(error);
      });
    });
  });
  
  // Serve video files
  app.get('/api/adburst/video/:videoId', serveGeneratedVideo);
  
  console.log('AdBurst Factory API routes registered');
}