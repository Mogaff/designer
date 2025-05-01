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
    files: 5 // Maximum 5 files (for longer videos)
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

// Middleware to handle file uploads (supporting up to 5 images for longer videos)
const uploadMiddleware = upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 },  // Optional for longer videos
  { name: 'image5', maxCount: 1 }   // Optional for longer videos
]);

// Initialize Anthropic client
// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Import all our API integrations
import { imageToVideo as geminiImageToVideo } from './veo_api';
import { imageToVideo as klingImageToVideo, checkKlingApiKey } from './kling_api';
import { imageToVideo as falImageToVideo, checkFalApiKey } from './fal_i2v_api';
import { generateAdScript } from './openai_api';
import { textToSpeech } from './elevenlabs_api';
import { combineVideoAudio } from './ffmpeg_utils';
import { uploadToBuffer } from './buffer_api';
import { createMultiImageVideo } from './video_processor';

/**
 * Check API keys for all services
 * This is important to diagnose potential issues early
 */
export async function checkAllApiKeys() {
  const results = {
    gemini: false,
    claude: false,
    openai: false,
    elevenlabs: false,
    kling: false,
    fal: false
  };
  
  try {
    // Check Gemini API key
    if (process.env.GEMINI_API_KEY) {
      const keyLength = process.env.GEMINI_API_KEY.length;
      console.log(`✓ Gemini API key found (${keyLength} chars): ${process.env.GEMINI_API_KEY.substring(0, 4)}...${process.env.GEMINI_API_KEY.substring(keyLength - 4)}`);
      results.gemini = true;
    } else {
      console.error('✗ Gemini API key is not set');
    }
    
    // Check Claude API key
    if (process.env.ANTHROPIC_API_KEY) {
      const keyLength = process.env.ANTHROPIC_API_KEY.length;
      console.log(`✓ Claude API key found (${keyLength} chars): ${process.env.ANTHROPIC_API_KEY.substring(0, 4)}...${process.env.ANTHROPIC_API_KEY.substring(keyLength - 4)}`);
      results.claude = true;
    } else {
      console.error('✗ Claude API key is not set');
    }
    
    // Check OpenAI API key
    if (process.env.OPENAI_API_KEY) {
      const keyLength = process.env.OPENAI_API_KEY.length;
      console.log(`✓ OpenAI API key found (${keyLength} chars): ${process.env.OPENAI_API_KEY.substring(0, 4)}...${process.env.OPENAI_API_KEY.substring(keyLength - 4)}`);
      results.openai = true;
    } else {
      console.error('✗ OpenAI API key is not set');
    }
    
    // Check ElevenLabs API key
    if (process.env.ELEVENLABS_API_KEY) {
      const keyLength = process.env.ELEVENLABS_API_KEY.length;
      console.log(`✓ ElevenLabs API key found (${keyLength} chars): ${process.env.ELEVENLABS_API_KEY.substring(0, 4)}...${process.env.ELEVENLABS_API_KEY.substring(keyLength - 4)}`);
      results.elevenlabs = true;
    } else {
      console.error('✗ ElevenLabs API key is not set');
    }
    
    // Check Fal AI API key
    if (process.env.FAL_KEY) {
      const keyLength = process.env.FAL_KEY.length;
      console.log(`✓ Fal AI API key found (${keyLength} chars): ${process.env.FAL_KEY.substring(0, 4)}...${process.env.FAL_KEY.substring(keyLength - 4)}`);
      results.fal = true;
      
      // Attempt to validate the Fal AI API key
      try {
        const isValid = await checkFalApiKey();
        if (isValid) {
          console.log('Fal AI API key validation successful');
        } else {
          console.warn('⚠ Fal AI API key might not be valid or has insufficient permissions');
        }
      } catch (error) {
        console.error('Error validating Fal AI API key:', error);
      }
    } else {
      console.error('✗ Fal AI API key is not set');
    }
    
    // Check Kling API key
    if (process.env.KLING_API_KEY) {
      const keyLength = process.env.KLING_API_KEY.length;
      console.log(`✓ Kling API key found (${keyLength} chars): ${process.env.KLING_API_KEY.substring(0, 4)}...${process.env.KLING_API_KEY.substring(keyLength - 4)}`);
      results.kling = true;
      
      // Attempt to validate the Kling API key
      try {
        const isValid = await checkKlingApiKey();
        if (isValid) {
          console.log('Kling API key validation successful');
        } else {
          console.warn('⚠ Kling API key might not be valid or has insufficient permissions');
        }
      } catch (error) {
        console.error('Error validating Kling API key:', error);
      }
    } else {
      console.error('✗ Kling API key is not set');
    }
    
    return results;
  } catch (error) {
    console.error('Error checking API keys:', error);
    return results;
  }
}

/**
 * Generate script using Claude 3.7
 * Supports both short (8-second) and long (up to 20-second) scripts
 */
async function generateScript(options: {
  productName: string;
  productDescription?: string;
  targetAudience?: string;
  duration?: number;
}): Promise<string> {
  // Determine script length based on duration
  const duration = options.duration || 8; // Default to 8 seconds if not specified
  const isLongScript = duration > 10; // Consider anything over 10 seconds as "long"
  
  console.log(`Generating ${isLongScript ? 'long' : 'short'} script with Claude 3.7 for ${duration} seconds...`);
  
  try {
    const systemPrompt = `You are Claude, an award-winning, highly skilled marketing copywriter specializing in premium, emotionally engaging social media video scripts for vertical video advertisements.

Use your advanced techniques to craft compelling marketing copy with excellent rhythm, flow, and narrative structure. Every script should be on-brand and sophisticated, striking the right tone for its target audience.

Integrate marketing psychology and conversion-focused thinking into your copy choices so that your text not only sounds great but also drives audience engagement and action. Stay current with copywriting trends to keep your work fresh, yet always ensure the final result feels timeless and persuasive.

Craft scripts that are:
- Attention-grabbing from the first line
- Emotionally resonant and premium in tone
- Clear with a specific benefit focus
- Structured with a coherent beginning, middle, and end
- Ending with a compelling call-to-action
- Perfect for reading aloud at a natural, professional pace
- Designed for maximum conversion and audience engagement`;
      
    // Customize the user prompt based on script length
    const wordCount = isLongScript ? 
      "65-80 words (for a 20-second video)" : 
      "30-40 words (for an 8-second video)";
    
    const structureGuidance = isLongScript ?
      `- Structure the script with a clear introduction (hook), middle section (key benefits/features), and conclusion (call-to-action)
      - Include 3-4 distinct points or features that can be highlighted in different segments
      - Create natural transition points between ideas (approximately every 5 seconds)` :
      `- Keep the script concise and impactful
      - Focus on a single key benefit or feature
      - Maintain a quick, engaging pace`;
      
    const userPrompt = `Create a premium ${duration}-second vertical video ad script for:
        
      PRODUCT: ${options.productName}
      ${options.productDescription ? `DESCRIPTION: ${options.productDescription}` : ''}
      ${options.targetAudience ? `TARGET AUDIENCE: ${options.targetAudience}` : ''}
      
      CRITICAL REQUIREMENTS:
      - Must be exactly ${wordCount}
      - Start with an emotional hook or surprising statement
      - Include aspirational language that conveys premium quality
      ${structureGuidance}
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
 * 2. Generate script with Claude 3.7
 * 3. Generate video from primary image (Kling or Gemini Veo)
 * 4. Generate voiceover (ElevenLabs)
 * 5. Combine video and audio (FFmpeg)
 * 6. Upload to social media (Buffer)
 */
export async function processAdBurstRequest(req: Request, res: Response) {
  try {
    // Check API keys first
    console.log('Checking API keys before processing request...');
    const apiKeyStatus = await checkAllApiKeys();
    console.log('API key status:', apiKeyStatus);
    
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
        message: 'Please upload at least 3 required image files (image1, image2, image3)' 
      });
    }
    
    // Combine all images into a single array
    const imageFiles = [
      ...files.image1,
      ...files.image2,
      ...files.image3,
      ...(files.image4 || []),  // Optional 4th image
      ...(files.image5 || [])   // Optional 5th image
    ];
    
    // Check if we have enough images (3-5)
    if (imageFiles.length < 3) {
      return res.status(400).json({ 
        success: false,
        message: 'Please upload at least 3 image files' 
      });
    }
    
    if (imageFiles.length > 5) {
      return res.status(400).json({ 
        success: false,
        message: 'Maximum 5 image files allowed' 
      });
    }
    
    console.log(`Processing AdBurst for ${productName} with ${imageFiles.length} images`);
    
    // Save images to temporary storage
    const imagePaths = saveUploadedFiles(imageFiles);
    console.log('Images saved to:', imagePaths);
    
    // Step 2: Generate script using Claude 3.7 first - this is more reliable
    console.log('Starting script generation...');
    
    // Get the target duration from request or use default
    const targetDuration = req.body.videoDuration ? 
      parseInt(req.body.videoDuration, 10) : 20; // Default to 20 seconds
    
    let script;
    try {
      script = await generateScript({
        productName,
        productDescription,
        targetAudience,
        duration: targetDuration // Pass the duration to generate script of appropriate length
      });
      console.log(`Script generation complete for ${targetDuration}-second video:`, script);
    } catch (scriptError) {
      console.error('Error generating script:', scriptError);
      return res.status(500).json({
        success: false,
        message: `Error generating ad script: ${scriptError instanceof Error ? scriptError.message : 'Unknown error'}`
      });
    }
    
    // Step 3: Generate multi-image video from all uploaded images
    console.log('Starting multi-image video generation...');
    let rawVideoPath;
    try {
      // Check if we have Fal AI API key for image-to-video conversion
      if (apiKeyStatus.fal) {
        console.log('Using Multi-Image Video Processor with Fal AI...');
        try {
          // Get the target duration from request or use default
          const targetDuration = req.body.videoDuration ? 
            parseInt(req.body.videoDuration, 10) : 20; // Default to 20 seconds
            
          // Process all images into a combined video
          rawVideoPath = await createMultiImageVideo(
            imagePaths, 
            {
              productName,
              productDescription,
              targetAudience,
              totalDuration: targetDuration
            }
          );
          console.log('Multi-image video generation complete:', rawVideoPath);
        } catch (videoError) {
          console.error('Error generating multi-image video:', videoError);
          
          // Fallback to single-image approach if multi-image processing fails
          console.log('Falling back to single-image video generation...');
          
          // Generate a prompt based on the product information
          const singleVideoPrompt = `Professional ${productName} demonstration with smooth camera movement and elegant transitions. Elegant and premium product showcase with cinematic quality.`;
          
          try {
            // Try with Fal AI image-to-video
            rawVideoPath = await falImageToVideo(
              imagePaths[0], // Use the first image for video generation
              singleVideoPrompt,
              { aspectRatio: "9:16" } // Vertical video for social media
            );
            console.log('Fallback video generation with Fal AI complete:', rawVideoPath);
          } catch (falError) {
            console.error('Error with fallback Fal AI video generation:', falError);
            
            // Try Kling as second fallback
            if (apiKeyStatus.kling) {
              console.log('Trying Kling as second fallback...');
              try {
                rawVideoPath = await klingImageToVideo(
                  imagePaths[0],
                  singleVideoPrompt,
                  { aspectRatio: "9:16" }
                );
                console.log('Video generation with Kling complete:', rawVideoPath);
              } catch (klingError) {
                console.error('Error with Kling fallback:', klingError);
                
                // Try Gemini as final fallback
                if (apiKeyStatus.gemini) {
                  console.log('Trying Gemini Veo as final fallback...');
                  try {
                    rawVideoPath = await geminiImageToVideo(imagePaths[0]);
                    console.log('Video generation with Gemini Veo complete:', rawVideoPath);
                  } catch (geminiError) {
                    throw new Error(`All video generation methods failed: Multi-image: ${videoError instanceof Error ? videoError.message : 'Unknown error'} | Fal AI: ${falError instanceof Error ? falError.message : 'Unknown error'} | Kling: ${klingError instanceof Error ? klingError.message : 'Unknown error'} | Gemini: ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}`);
                  }
                } else {
                  throw new Error(`Multiple video generation methods failed: ${falError instanceof Error ? falError.message : 'Unknown error'} | ${klingError instanceof Error ? klingError.message : 'Unknown error'}`);
                }
              }
            } else if (apiKeyStatus.gemini) {
              // If no Kling API key, try Gemini directly
              console.log('Trying Gemini Veo as fallback...');
              try {
                rawVideoPath = await geminiImageToVideo(imagePaths[0]);
                console.log('Video generation with Gemini Veo complete:', rawVideoPath);
              } catch (geminiError) {
                throw new Error(`Multiple video generation methods failed: ${videoError instanceof Error ? videoError.message : 'Unknown error'} | ${falError instanceof Error ? falError.message : 'Unknown error'} | ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}`);
              }
            } else {
              throw falError; // Re-throw if we don't have any other fallbacks
            }
          }
        }
      } else {
        // No Fal AI API key, try with other providers directly
        console.log('Fal AI API key not available, using alternative video generation...');
        
        if (apiKeyStatus.kling) {
          // Try with Kling
          console.log('Using Kling for video generation...');
          const videoPrompt = `Professional ${productName} demonstration with smooth camera movement and elegant transitions. Elegant and premium product showcase with cinematic quality.`;
          try {
            rawVideoPath = await klingImageToVideo(
              imagePaths[0],
              videoPrompt,
              { aspectRatio: "9:16" }
            );
            console.log('Video generation with Kling complete:', rawVideoPath);
          } catch (klingError) {
            console.error('Error generating video with Kling:', klingError);
            
            // Try Gemini as fallback
            if (apiKeyStatus.gemini) {
              console.log('Falling back to Gemini Veo for video generation...');
              try {
                rawVideoPath = await geminiImageToVideo(imagePaths[0]);
                console.log('Video generation with Gemini Veo complete:', rawVideoPath);
              } catch (geminiError) {
                throw new Error(`Both Kling and Gemini Veo failed: ${klingError instanceof Error ? klingError.message : 'Unknown error'} | ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}`);
              }
            } else {
              throw klingError; // Re-throw if we don't have a fallback
            }
          }
        } else if (apiKeyStatus.gemini) {
          // If no Kling API key, try Gemini
          console.log('Using Gemini Veo for video generation...');
          rawVideoPath = await geminiImageToVideo(imagePaths[0]);
          console.log('Video generation with Gemini Veo complete:', rawVideoPath);
        } else {
          throw new Error('No video generation API keys available. Please configure FAL_KEY, KLING_API_KEY, or GEMINI_API_KEY.');
        }
      }
    } catch (error) {
      const videoError = error as Error;
      console.error('Error generating video:', videoError);
      
      // Return a more useful response with both the script and the error
      // Special handling for API LIMITATION error message
      const errorMessage = videoError.message || 'Unknown error';
      const isApiLimitation = errorMessage.includes('API LIMITATION:');
      
      return res.status(isApiLimitation ? 200 : 500).json({
        success: false,
        message: errorMessage,
        isApiLimitation: isApiLimitation,
        partialResults: {
          script,
          generatedAt: new Date().toISOString(),
          productName,
          apiStatus: {
            claude: "Success", // Script was generated 
            videoGeneration: "Failed", // Video generation failed
            errorDetails: errorMessage
          }
        }
      });
    }
    
    // Step 4: Generate voiceover from script using ElevenLabs
    console.log('Starting voiceover generation with ElevenLabs...');
    let audioPath;
    try {
      audioPath = await textToSpeech(script);
      console.log('Voiceover generation complete:', audioPath);
    } catch (error) {
      const audioError = error as Error;
      console.error('Error generating audio:', audioError);
      return res.status(500).json({
        success: false,
        message: `Error generating voiceover: ${audioError.message}`,
        partialResults: {
          script,
          videoPath: rawVideoPath,
          generatedAt: new Date().toISOString(),
          productName
        }
      });
    }
    
    // Step 5: Combine video with voiceover using FFmpeg
    console.log('Combining video and audio...');
    const watermarkPath = path.join(process.cwd(), 'temp', 'watermark.png');
    const hasWatermark = fs.existsSync(watermarkPath);
    
    let outputFileName;
    try {
      outputFileName = await combineVideoAudio(
        rawVideoPath, 
        audioPath, 
        hasWatermark ? watermarkPath : undefined
      );
      console.log('Video processing complete:', outputFileName);
    } catch (error) {
      const ffmpegError = error as Error;
      console.error('Error combining video and audio:', ffmpegError);
      return res.status(500).json({
        success: false,
        message: `Error processing final video: ${ffmpegError.message}`,
        partialResults: {
          script,
          videoPath: rawVideoPath,
          audioPath,
          generatedAt: new Date().toISOString(),
          productName
        }
      });
    }
    
    // Step 6: Upload to Buffer for social media distribution (optional)
    let bufferData = null;
    try {
      console.log('Uploading to Buffer for social media...');
      bufferData = await uploadToBuffer(
        path.join(process.cwd(), 'temp', outputFileName),
        `${productName} - ${script.split('.')[0]}`, // Use first sentence as caption
        ['instagram', 'tiktok']
      );
      console.log('Buffer upload complete:', bufferData);
    } catch (error) {
      // Non-critical error, just log it
      console.error('Buffer upload failed (optional step):', error);
    }
    
    // Provide a video URL pointing to our API
    const videoUrl = `/api/adburst/video/${outputFileName}`;
    
    // Step 7: Return success response with all data
    return res.status(200).json({
      success: true,
      videoUrl,
      script,
      message: 'Ad generated successfully with full AdBurst Factory workflow',
      processingTime: targetDuration <= 10 ? '~90 seconds' : '~2-3 minutes', // Estimated time based on duration
      socialMedia: bufferData || 'Not available',
      // Include metadata for front-end display
      metadata: {
        productName,
        generatedAt: new Date().toISOString(),
        videoLength: `${targetDuration} seconds`,
        aspectRatio: '9:16 (vertical)',
        imagesUsed: imagePaths.length,
        scriptWordCount: script.split(/\s+/).length
      }
    });
  } catch (error) {
    // This catch will handle any unexpected errors not caught in specific sections
    const mainError = error as Error;
    console.error('Unhandled error in processAdBurstRequest:', mainError);
    return res.status(500).json({
      success: false,
      message: `Unhandled error: ${mainError.message || 'Unknown error'}`
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
  // Check API keys on startup
  console.log('Checking API keys for AdBurst Factory...');
  checkAllApiKeys().then(results => {
    console.log('API key check results:', results);
  });
  
  // Add a diagnostic endpoint to check API key status
  app.get('/api/adburst/status', async (req: Request, res: Response) => {
    const apiStatus = await checkAllApiKeys();
    return res.status(200).json({
      success: true,
      apiStatus,
      message: 'API key status check completed',
      timestamp: new Date().toISOString()
    });
  });
  
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