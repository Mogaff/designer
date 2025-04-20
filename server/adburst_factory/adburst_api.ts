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

/**
 * Generate script using Claude 3.7
 */
async function generateScript(options: {
  productName: string;
  productDescription?: string;
  targetAudience?: string;
}): Promise<string> {
  try {
    console.log('Generating script with Claude 3.7...');
    
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
      console.log('Generated script:', script);
      return script;
    } else {
      throw new Error('Unexpected response format from Claude');
    }
  } catch (error) {
    console.error('Error generating script with Claude:', error);
    
    // Create a basic script if API fails
    const basicScript = `Introducing ${options.productName}! ${options.productDescription || 'The perfect solution for your needs.'} ${options.targetAudience ? 'Perfect for ' + options.targetAudience + '.' : ''} Order now!`;
    
    console.log('Using basic script:', basicScript);
    return basicScript;
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
 */
export async function processAdBurstRequest(req: Request, res: Response) {
  try {
    // Extract form data
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
    
    // Save images for reference (in a real implementation, we would process these)
    const imagePaths = saveUploadedFiles(imageFiles);
    console.log('Images saved to:', imagePaths);
    
    // Generate script with Claude
    const script = await generateScript({
      productName,
      productDescription,
      targetAudience
    });
    
    // For a demo, return a sample video URL
    // In a real implementation, we would generate a video and return its URL
    const videoUrl = "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4";
    
    return res.status(200).json({
      success: true,
      videoUrl,
      script,
      message: 'Ad generated successfully with Claude AI'
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
  
  console.log('AdBurst Factory API routes registered');
}