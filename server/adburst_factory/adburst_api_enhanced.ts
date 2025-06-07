/**
 * Enhanced AdBurst Factory API
 * Supports 5-60 second videos with AI image generation using Flux
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';

// Import Flux image generation service
import { generateBackgroundImage } from '../fluxImageService';

// Configure multer for file uploads (supporting up to 12 images for 60-second videos)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 12 // Maximum 12 files for 60-second videos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Enhanced middleware to handle more image uploads
const uploadMiddleware = upload.fields([
  { name: 'image1', maxCount: 1 },
  { name: 'image2', maxCount: 1 },
  { name: 'image3', maxCount: 1 },
  { name: 'image4', maxCount: 1 },
  { name: 'image5', maxCount: 1 },
  { name: 'image6', maxCount: 1 },
  { name: 'image7', maxCount: 1 },
  { name: 'image8', maxCount: 1 },
  { name: 'image9', maxCount: 1 },
  { name: 'image10', maxCount: 1 },
  { name: 'image11', maxCount: 1 },
  { name: 'image12', maxCount: 1 },
  { name: 'images', maxCount: 12 }
]);

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Calculate required images based on video duration
 */
function calculateRequiredImages(duration: number): { min: number; max: number; recommended: number } {
  if (duration <= 10) {
    return { min: 3, max: 4, recommended: 3 };
  } else if (duration <= 20) {
    return { min: 4, max: 6, recommended: 5 };
  } else if (duration <= 40) {
    return { min: 6, max: 8, recommended: 7 };
  } else {
    return { min: 8, max: 12, recommended: 10 };
  }
}

/**
 * Generate story-based image prompts for Flux AI
 */
async function generateImagePromptsFromStory(options: {
  productName: string;
  productDescription?: string;
  targetAudience?: string;
  duration: number;
  imageCount: number;
}): Promise<string[]> {
  
  const { productName, productDescription, targetAudience, duration, imageCount } = options;
  
  console.log(`Generating ${imageCount} image prompts for ${duration}-second video...`);
  
  const systemPrompt = `You are an expert visual storytelling director specializing in creating compelling image sequences for video advertisements. Create a series of image prompts that will work together to tell a cohesive visual story.`;
  
  const userPrompt = `Create ${imageCount} distinct, high-quality image prompts for a ${duration}-second video advertisement for:

PRODUCT: ${productName}
${productDescription ? `DESCRIPTION: ${productDescription}` : ''}
${targetAudience ? `TARGET AUDIENCE: ${targetAudience}` : ''}

Requirements:
- Each image should be visually striking and professional
- Images should flow together to tell a story
- Include lifestyle shots, product details, and emotional moments
- Suitable for vertical (9:16) video format
- High-quality commercial photography style

Return exactly ${imageCount} image prompts, one per line, numbered 1-${imageCount}.
Each prompt should be detailed and specific for optimal AI image generation.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      system: systemPrompt,
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const prompts = content.text
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(prompt => prompt.length > 10);
      
      console.log(`Generated ${prompts.length} image prompts`);
      return prompts.slice(0, imageCount);
    }
  } catch (error) {
    console.error('Error generating image prompts:', error);
    throw error;
  }
  
  return [];
}

/**
 * Generate images using Flux AI
 */
async function generateImagesWithFlux(prompts: string[]): Promise<string[]> {
  console.log(`Generating ${prompts.length} images with Flux AI...`);
  
  const imageUrls: string[] = [];
  
  for (let i = 0; i < prompts.length; i++) {
    try {
      console.log(`Generating image ${i + 1}/${prompts.length}: ${prompts[i].substring(0, 50)}...`);
      
      const imageUrl = await generateBackgroundImage({
        prompt: prompts[i],
        imageSize: "portrait_16_9", // Vertical format for video
        numInferenceSteps: 4
      });
      
      imageUrls.push(imageUrl);
      console.log(`✓ Generated image ${i + 1}: ${imageUrl}`);
      
      // Small delay to avoid rate limiting
      if (i < prompts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error generating image ${i + 1}:`, error);
      throw new Error(`Failed to generate image ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return imageUrls;
}

/**
 * Enhanced script generation supporting up to 60 seconds
 */
async function generateEnhancedScript(options: {
  productName: string;
  productDescription?: string;
  targetAudience?: string;
  duration: number;
}): Promise<string> {
  
  const { duration } = options;
  console.log(`Generating enhanced script for ${duration}-second video...`);
  
  const systemPrompt = `You are Claude, an award-winning marketing copywriter specializing in premium video advertisements. Create compelling, emotionally engaging scripts that drive conversions.

Craft scripts that are:
- Attention-grabbing from the first line
- Emotionally resonant and premium in tone
- Structured with clear narrative flow
- Perfect for professional voiceover
- Designed for maximum engagement and conversion`;

  let wordCount: string;
  let structureGuidance: string;
  
  if (duration <= 10) {
    wordCount = "30-45 words";
    structureGuidance = `
- Keep script concise and impactful
- Focus on single key benefit
- Create immediate emotional hook
- End with clear call-to-action`;
  } else if (duration <= 30) {
    wordCount = "80-120 words";
    structureGuidance = `
- Structure: Hook → Benefits → Call-to-action
- Include 2-3 key product highlights
- Create natural transition points
- Build emotional connection`;
  } else {
    wordCount = "180-250 words";
    structureGuidance = `
- Create complete story arc: Introduction → Development → Climax → Resolution
- Include 4-6 distinct segments highlighting different product aspects
- Build strong emotional narrative
- Include social proof and credibility elements
- Create natural transition points every 8-10 seconds
- Multiple benefit points with storytelling approach`;
  }

  const userPrompt = `Create a premium ${duration}-second vertical video advertisement script for:

PRODUCT: ${options.productName}
${options.productDescription ? `DESCRIPTION: ${options.productDescription}` : ''}
${options.targetAudience ? `TARGET AUDIENCE: ${options.targetAudience}` : ''}

REQUIREMENTS:
- Exactly ${wordCount}
- Professional, conversational tone
- Premium brand positioning
${structureGuidance}

Return only the script text, no additional commentary.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      system: systemPrompt,
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const script = content.text.trim();
      console.log(`✓ Generated ${duration}s script: ${script.substring(0, 100)}...`);
      return script;
    }
  } catch (error) {
    console.error('Error generating script:', error);
    throw error;
  }
  
  throw new Error('Failed to generate script');
}

/**
 * Enhanced AdBurst processing with AI image generation support
 */
export async function processEnhancedAdBurst(req: Request, res: Response) {
  try {
    console.log('Processing enhanced AdBurst request...');
    
    // Extract form data
    const { 
      productName, 
      productDescription, 
      targetAudience, 
      videoDuration,
      useAiImages 
    } = req.body;
    
    if (!productName) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }
    
    // Parse and validate duration (5-60 seconds)
    const duration = parseInt(videoDuration, 10) || 20;
    if (duration < 5 || duration > 60) {
      return res.status(400).json({
        success: false,
        message: 'Video duration must be between 5 and 60 seconds'
      });
    }
    
    // Calculate required images
    const imageRequirements = calculateRequiredImages(duration);
    console.log(`Duration: ${duration}s, Required images:`, imageRequirements);
    
    let imagePaths: string[] = [];
    let generatedWithAI = false;
    
    // Check if user wants AI-generated images
    if (useAiImages === 'true') {
      console.log('Generating images with AI...');
      
      try {
        // Generate image prompts based on product story
        const imagePrompts = await generateImagePromptsFromStory({
          productName,
          productDescription,
          targetAudience,
          duration,
          imageCount: imageRequirements.recommended
        });
        
        // Generate images using Flux
        const imageUrls = await generateImagesWithFlux(imagePrompts);
        imagePaths = imageUrls; // Store URLs instead of local paths for AI images
        generatedWithAI = true;
        
        console.log(`✓ Generated ${imagePaths.length} AI images`);
        
      } catch (error) {
        console.error('AI image generation failed:', error);
        return res.status(500).json({
          success: false,
          message: `AI image generation failed: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    } else {
      // Handle uploaded images
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (!files) {
        return res.status(400).json({
          success: false,
          message: `Please upload at least ${imageRequirements.min} images or enable AI image generation`
        });
      }
      
      // Combine uploaded images
      let imageFiles: Express.Multer.File[] = [];
      
      // Check different upload patterns
      if (files.images) {
        imageFiles = [...files.images];
      } else {
        for (let i = 1; i <= 12; i++) {
          if (files[`image${i}`]) {
            imageFiles.push(...files[`image${i}`]);
          }
        }
      }
      
      // Validate image count
      if (imageFiles.length < imageRequirements.min) {
        return res.status(400).json({
          success: false,
          message: `Please upload at least ${imageRequirements.min} images for a ${duration}-second video`
        });
      }
      
      if (imageFiles.length > imageRequirements.max) {
        return res.status(400).json({
          success: false,
          message: `Maximum ${imageRequirements.max} images allowed for ${duration}-second video`
        });
      }
      
      // Save uploaded files
      imagePaths = saveUploadedFiles(imageFiles);
      console.log(`✓ Processed ${imagePaths.length} uploaded images`);
    }
    
    // Generate enhanced script
    console.log('Generating enhanced script...');
    const script = await generateEnhancedScript({
      productName,
      productDescription,
      targetAudience,
      duration
    });
    
    // For now, return success with script and image info
    // Video generation will be implemented next
    const videoId = uuidv4();
    
    return res.status(200).json({
      success: true,
      videoId,
      script,
      message: `Enhanced ${duration}-second ad generated successfully`,
      metadata: {
        duration: `${duration} seconds`,
        imagesUsed: imagePaths.length,
        generatedWithAI,
        imageRequirements,
        processingTime: duration <= 20 ? '~2-3 minutes' : '~4-6 minutes'
      }
    });
    
  } catch (error) {
    console.error('Enhanced AdBurst processing error:', error);
    return res.status(500).json({
      success: false,
      message: `Processing failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

/**
 * Save uploaded files to temporary storage
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
 * Register enhanced AdBurst routes
 */
export function registerEnhancedAdBurstRoutes(app: any) {
  // Enhanced AdBurst endpoint
  app.post('/api/adburst/enhanced', (req: Request, res: Response, next: NextFunction) => {
    uploadMiddleware(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 10MB' });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: 'Too many files. Maximum is 12 images' });
          }
        }
        return res.status(400).json({ message: err.message });
      }
      
      processEnhancedAdBurst(req, res).catch(error => next(error));
    });
  });
  
  console.log('Enhanced AdBurst routes registered');
}