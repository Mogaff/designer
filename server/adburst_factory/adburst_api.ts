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
 * Generate script using Claude 3.7
 * Direct implementation without fallbacks as per requirements
 */
async function generateScript(options: {
  productName: string;
  productDescription?: string;
  targetAudience?: string;
}): Promise<string> {
  // Use Claude 3.7 directly without fallbacks
  console.log('Generating script with Claude 3.7...');
  
  try {
    const systemPrompt = `You are an expert marketing copywriter specializing in premium, emotionally engaging social media video scripts.
      
Your specialty is creating concise, high-impact scripts for short-form vertical video advertisements.
      
Craft scripts that are:
- Attention-grabbing from the first line
- Emotionally resonant and premium in tone
- Clear with a specific benefit focus
- Ending with a compelling call-to-action
- Perfect for reading aloud in exactly 8 seconds (30-40 words max)`;
      
    const userPrompt = `Create a premium 8-second vertical video ad script for:
        
      PRODUCT: ${options.productName}
      ${options.productDescription ? `DESCRIPTION: ${options.productDescription}` : ''}
      ${options.targetAudience ? `TARGET AUDIENCE: ${options.targetAudience}` : ''}
      
      CRITICAL REQUIREMENTS:
      - Must be exactly 30-40 words (for an 8-second video)
      - Start with an emotional hook or surprising statement
      - Include aspirational language that conveys premium quality
      - End with a clear, specific call-to-action
      - Use natural, conversational language that flows well when spoken
      - Maintain a sophisticated, luxury tone
      
      RETURN ONLY THE SCRIPT TEXT WITH NO ADDITIONAL COMMENTARY.`;
    
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
    throw new Error('Claude 3.7 failed to generate a script. Check the ANTHROPIC_API_KEY and try again.');
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
 * 3. Generate script (Claude 3.7)
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
    // Run these processes separately to better handle errors
    
    // Step 3: Generate script using Claude 3.7 first - this is more reliable
    console.log('Starting script generation...');
    let script;
    try {
      script = await generateScript({
        productName,
        productDescription,
        targetAudience
      });
      console.log('Script generation complete:', script);
    } catch (scriptError) {
      console.error('Error generating script:', scriptError);
      return res.status(500).json({
        success: false,
        message: `Error generating ad script: ${scriptError instanceof Error ? scriptError.message : 'Unknown error'}`
      });
    }
    
    // Step 2: Generate video from primary image using Veo 2
    console.log('Starting video generation with Veo 2...');
    let rawVideoPath;
    try {
      rawVideoPath = await imageToVideo(imagePaths[0]); // Use the first image for video generation
      console.log('Video generation complete:', rawVideoPath);
    } catch (videoError) {
      console.error('Error generating video:', videoError);
      
      // Return a more useful response with both the script and the error
      return res.status(500).json({
        success: false,
        message: `Error generating video: ${videoError instanceof Error ? videoError.message : 'Unknown error'}`,
        partialResults: {
          script,
          generatedAt: new Date().toISOString(),
          productName,
          apiStatus: {
            claude: "Success", // Script was generated 
            geminiVeo: "Unavailable", // Video generation API limitation
            errorDetails: videoError instanceof Error ? videoError.message : 'Unknown error'
          }
        }
      });
    }
    
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