import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import fs from "fs";
import { generateFlyer } from "./flyerGenerator";
import { renderFlyerFromGemini } from "./geminiFlyer";
import { renderFlyerFromClaude } from "./claudeFlyer";
import { generateBackgroundImageHandler } from "./fluxImageService";
import multer from "multer";
import { log } from "./vite";
import passport from "./auth";
import { hashPassword, isAuthenticated } from "./auth";
import { insertUserSchema, insertDesignConfigSchema, insertUserCreditsSchema, insertUserCreationSchema, insertBrandKitSchema } from "@shared/schema";
import { createCheckoutSession, verifyCheckoutSession, handleStripeWebhook, CREDIT_PACKAGES } from "./stripe";
import { registerAdBurstApiRoutes } from "./adburst_factory/adburst_api";
import { registerCompetitorAdRoutes, registerAdInspirationIntegrationRoutes } from "./competitor_ads/routes";

// Using the built-in type definitions from @types/multer

// Set up multer storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit - increased to handle multiple images
  },
});

// Create a multer middleware that can handle multiple files
const uploadFields = upload.fields([
  { name: 'background_image', maxCount: 10 }, // Allow up to 10 images for carousel
  { name: 'logo', maxCount: 1 }
]);

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize and register the AdBurst Factory routes
  registerAdBurstApiRoutes(app);
  
  // Register the competitor ad search and inspiration routes
  registerCompetitorAdRoutes(app);
  registerAdInspirationIntegrationRoutes(app);
  
  // Add route for generating background images with Flux AI
  app.post("/api/generate-background", isAuthenticated, generateBackgroundImageHandler);
  
  // Serve the credits admin page
  app.get("/admin/credits", (req: Request, res: Response) => {
    res.sendFile(path.resolve(process.cwd(), "add-credits.html"));
  });
  // API endpoint to generate multiple flyer designs using Claude AI
  app.post("/api/generate-ai", isAuthenticated, uploadFields, async (req: Request, res: Response) => {
    // CRITICAL FIX for design generator - May 1, 2025
    try {
      log("AI Flyer generation started - Phase 1: Design Suggestions", "generator");
      
      // Extract parameters from request body
      // Note: Client might use either designCount or design_count, so we check for both
      const { prompt, configId, designCount, design_count, aspectRatio, templateInfo, brand_kit_id } = req.body;
      const userId = (req.user as any).id;
      
      // Parse template information if provided
      let parsedTemplateInfo;
      if (templateInfo) {
        try {
          parsedTemplateInfo = JSON.parse(templateInfo);
          log(`Using template: ${parsedTemplateInfo.name}`, "generator");
        } catch (error) {
          log(`Error parsing template info: ${error}`, "generator");
        }
      }
      
      // Parse designCount (default to 4 if not specified or invalid)
      // Das designCount kommt aus dem premium option in frontend (1, 4, 8, 12)
      // We handle both camelCase (designCount) and snake_case (design_count) versions
      const parsedDesignCount = design_count || designCount;
      const numDesigns = parseInt(parsedDesignCount) || 4;
      log(`Parsed design count: ${numDesigns} (from input: ${parsedDesignCount})`, "generator");
      
      // WICHTIG: numDesigns wird als die tatsächliche Anzahl der zu generierenden Designs verwendet
      // Stellen Sie sicher, dass es mindestens 1 ist, aber keine Obergrenze mehr (für Premium-Optionen)
      const maxDesigns = Math.max(1, numDesigns); // Ensure minimum 1 design
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      // Get user's current credit balance
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get design configuration (default or user-specified)
      let designConfig;
      if (configId) {
        designConfig = await storage.getDesignConfig(parseInt(configId));
        if (!designConfig) {
          return res.status(404).json({ message: "Design configuration not found" });
        }
      } else {
        // Try to get system configs first
        const systemConfigs = await storage.getDesignConfigs(0); // System configs have user_id 0
        
        if (systemConfigs && systemConfigs.length > 0) {
          designConfig = systemConfigs.find(c => c.active) || systemConfigs[0];
        } else {
          // Try to get user configs as fallback
          const userConfigs = await storage.getDesignConfigs(userId);
          
          if (userConfigs && userConfigs.length > 0) {
            designConfig = userConfigs.find(c => c.active) || userConfigs[0];
          } else {
            // Create a default config if none exists
            designConfig = await storage.createDesignConfig({
              user_id: userId,
              name: 'Default Config',
              num_variations: 3,
              credits_per_design: 1,
              active: true
            });
          }
        }
      }
      
      // Calculate credits required based on number of designs ACTUALLY requested by the user
      const creditsPerDesign = designConfig.credits_per_design;
      // Wichtig: Die tatsächlich angeforderte Anzahl von Designs für Kreditberechnung verwenden
      const totalRequiredCredits = creditsPerDesign * numDesigns;
      
      // Check if user has enough credits
      if (user.credits_balance < totalRequiredCredits) {
        return res.status(403).json({ 
          message: "Insufficient credits",
          creditsRequired: totalRequiredCredits,
          creditsAvailable: user.credits_balance,
          designCount: maxDesigns
        });
      }
      
      log(`Generating AI flyer with prompt: ${prompt}`, "generator");
      
      // Generate options for Claude
      const generationOptions: { 
        prompt: string; 
        backgroundImageBase64?: string;
        logoBase64?: string;
        aspectRatio?: string;
      } = {
        prompt: prompt,
        aspectRatio: aspectRatio
      };
      
      // Add images to options if provided (using type assertion for files)
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Check if carousel mode is enabled
      const createCarousel = req.body.create_carousel === "true";
      
      if (files && files.background_image) {
        const bgImages = files.background_image;
        log(`${bgImages.length} Background image(s) received for AI generation${createCarousel ? ' in carousel mode' : ''}`, "generator");
        
        // For all cases, use the first image as the primary reference image
        const backgroundImageBase64 = bgImages[0].buffer.toString('base64');
        generationOptions.backgroundImageBase64 = backgroundImageBase64;
        
        // If we have multiple images and carousel mode is enabled, store all images separately
        if (createCarousel && bgImages.length > 1) {
          log(`Carousel mode with ${bgImages.length} images - will apply consistent style across all images`, "generator");
          // Store all uploaded images for later use in the carousel
        }
      }
      
      // First check for uploaded logo
      if (files && files.logo && files.logo[0]) {
        log("Logo image received for AI generation", "generator");
        const logoBase64 = files.logo[0].buffer.toString('base64');
        generationOptions.logoBase64 = logoBase64;
      }
      // If brand_kit_id is provided, check for logo in the brand kit
      else if (brand_kit_id) {
        const brandKitId = parseInt(brand_kit_id);
        if (!isNaN(brandKitId)) {
          log(`Looking for logo in brand kit ID: ${brandKitId}`, "generator");
          const brandKit = await storage.getBrandKit(brandKitId, userId);
          
          if (brandKit && brandKit.logo_url) {
            log("Found logo in brand kit, including it in generation", "generator");
            // If logo URL starts with data:, it's already base64
            if (brandKit.logo_url.startsWith('data:')) {
              // Extract the base64 part after the comma
              const logoBase64 = brandKit.logo_url.split(',')[1];
              if (logoBase64) {
                generationOptions.logoBase64 = logoBase64;
              }
            }
          }
        }
      }
      
      // Generate design variations with distinct professional style instructions
      // Wir brauchen nur 4 Stile, da wir maximal 4 Designs generieren wollen
      const styleVariations = [
        "with a luxury brand aesthetic using dramatic contrasts and premium typography",
        "with a modern minimalist style emphasizing elegant white space and refined typography",
        "with a creative high-fashion approach using artistic compositions and sophisticated color",
        "with a premium corporate look featuring polished visuals and architectural precision"
      ];
      
      // Generate designs sequentially to avoid quota limits
      log(`Generating ${maxDesigns} design variations (user requested ${numDesigns})`, "generator");
      const successfulDesigns = [];
      
      // CRITICAL FIX: May 1, 2025 - Temporarily disable logo usage
      // This ensures designs will generate properly while we resolve Claude API format issues
      if (generationOptions.logoBase64) {
        log("⚠️ IMPORTANT: Brand kit with logo detected", "generator");
        log("⚠️ Temporarily disabling logo to ensure successful generation - will fix this in future update", "generator");
        generationOptions.logoBase64 = ""; // Temporarily disable logo to ensure generation works
      }
      
      // Determine how to proceed based on carousel mode and available images
      if (createCarousel && files && files.background_image && files.background_image.length > 1) {
        // Carousel mode with multiple images - use a truly consistent design approach
        log(`Carousel mode active with ${files.background_image.length} images`, "generator");
        
        // For carousel mode, use a completely different approach with explicit consistency instructions
        // Don't use any predefined style variations, instead explicitly ask for consistency
        
        // Define a set of fixed colors to use for all carousel designs
        const fixedColors = {
          primary: "#3B72C0",    // Blue
          secondary: "#E5A823",  // Gold/Yellow
          accent: "#1D364D",     // Dark Blue
          text: "#FFFFFF",       // White
          background: "#080F18"  // Very Dark Blue
        };
        
        // Create a common design brief for all images in the carousel with FIXED colors
        const carouselPrompt = `${generationOptions.prompt} 
        
CRITICAL: This is for a CAROUSEL of multiple images. You MUST use this EXACT FIXED COLOR PALETTE for ALL designs:
- Primary Color: ${fixedColors.primary} (Blue)
- Secondary Color: ${fixedColors.secondary} (Gold/Yellow)
- Accent Color: ${fixedColors.accent} (Dark Blue)
- Text Color: ${fixedColors.text} (White)
- Background Color: ${fixedColors.background} (Very Dark Blue)

CREATE IDENTICAL DESIGN ELEMENTS FOR ALL SLIDES:
- Use EXACTLY the same fonts, styles, and text positions on all slides
- Apply the EXACT same color palette defined above to all slides
- Maintain identical layout structure and spacing across all designs
- Use the same styling for borders, overlays, and decorative elements
- Position brand elements in the exact same location on every slide
- DO NOT DEVIATE from this color palette or design system

The finished carousel should look like ONE unified design campaign where only the background image changes.`;
        
        // Define a common CSS style that will be used for all carousel images
        const commonCss = `
.flyer-container {
  width: 800px;
  height: 800px;
  overflow: hidden;
  position: relative;
  font-family: "Montserrat", sans-serif;
  color: ${fixedColors.text};
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(8,15,24,0.7) 0%, rgba(29,54,77,0.6) 100%);
  z-index: 1;
}

.content {
  position: relative;
  z-index: 2;
  padding: 40px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  color: ${fixedColors.text};
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
}

.subtitle {
  font-size: 24px;
  font-weight: 500;
  color: ${fixedColors.secondary};
  margin-bottom: 8px;
}

.accent-bar {
  height: 4px;
  width: 120px;
  background-color: ${fixedColors.primary};
  margin: 16px auto;
}

.footer {
  text-align: center;
  margin-top: 20px;
}

.cta-button {
  display: inline-block;
  background-color: ${fixedColors.primary};
  color: ${fixedColors.text};
  padding: 12px 30px;
  border-radius: 30px;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 16px;
  margin-top: 20px;
  box-shadow: 0px 4px 8px rgba(0,0,0,0.2);
}`;
        
        // Process each image with this consistent approach
        // We'll store the first image's HTML/CSS to reuse for subsequent images
        let firstImageHtml = '';
        let firstImageCss = '';
        
        for (let imgIndex = 0; imgIndex < files.background_image.length; imgIndex++) {
          try {
            // For each image, create variant options with the consistency instructions
            const currentImageBase64 = files.background_image[imgIndex].buffer.toString('base64');
            
            // For the first image, use slightly different instructions to establish the design system
            const isFirstImage = imgIndex === 0;
            
            if (isFirstImage) {
              // First image - create the design system
              const firstImagePrompt = `${carouselPrompt}
              
This is the FIRST IMAGE in the carousel. Create the design system that will be used for ALL images.
Include the background image provided, but create a design that will work with other images too.
USE THIS EXACT CSS in your design to ensure consistency:

\`\`\`css
${commonCss}
\`\`\`

YOUR DESIGN MUST FOLLOW THIS CSS EXACTLY. Do not modify these core styles.`;
              
              const variantOptions = {
                ...generationOptions,
                backgroundImageBase64: currentImageBase64,
                prompt: firstImagePrompt,
                aspectRatio: aspectRatio,
                templateInfo: parsedTemplateInfo,
                logoBase64: "" // CRITICAL FIX: Ensure no logo is sent to Claude for now
              };
              
              log(`Generating first carousel image with base design system`, "generator");
              
              // Generate the first design
              const screenshot = await renderFlyerFromClaude(variantOptions);
              successfulDesigns.push({
                imageBuffer: screenshot,
                style: "Carousel design with consistent style system",
                carouselIndex: imgIndex
              });
              
            } else {
              // Subsequent images - use exact same design system as first image
              const subsequentImagePrompt = `${carouselPrompt}
              
This is slide #${imgIndex + 1} in the carousel. YOU MUST use the EXACT SAME design system as the first slide.
Only change the background image, keep EVERYTHING else identical - same colors, text layout, styling, and elements.
USE THIS EXACT CSS in your design to ensure consistency:

\`\`\`css
${commonCss}
\`\`\`

YOUR DESIGN MUST FOLLOW THIS CSS EXACTLY. Do not modify these core styles.`;
              
              const variantOptions = {
                ...generationOptions,
                backgroundImageBase64: currentImageBase64,
                prompt: subsequentImagePrompt,
                aspectRatio: aspectRatio,
                templateInfo: parsedTemplateInfo,
                logoBase64: "" // CRITICAL FIX: Ensure no logo is sent to Claude for now
              };
              
              log(`Generating carousel image ${imgIndex + 1} using consistent design system`, "generator");
              
              // Generate subsequent design
              const screenshot = await renderFlyerFromClaude(variantOptions);
              successfulDesigns.push({
                imageBuffer: screenshot,
                style: "Carousel design with consistent style system",
                carouselIndex: imgIndex
              });
            }
            
            // Minimal delay between requests
            if (imgIndex < files.background_image.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (error) {
            log(`Error generating carousel image ${imgIndex + 1}: ${error}`, "generator");
            // If quota error, stop processing
            const errorMessage = String(error);
            if (errorMessage.includes("API quota limit reached") || errorMessage.includes("429 Too Many Requests")) {
              log("Stopping carousel generation due to API quota limits", "generator");
              break;
            }
          }
        }
      } else {
        // Standard mode - generate different style variations
        const designsToGenerate = Math.min(numDesigns, styleVariations.length);
        
        log(`Will generate exactly ${designsToGenerate} designs (user requested: ${numDesigns})`, "generator");
        
        // Try each style variation until we have the requested number of successful designs
        for (let index = 0; index < designsToGenerate; index++) {
          const styleVariation = styleVariations[index];
          try {
            const variantOptions = {
              ...generationOptions,
              prompt: `${generationOptions.prompt} ${styleVariation}`,
              aspectRatio: aspectRatio,
              templateInfo: parsedTemplateInfo, // Pass the template info to the render function
              logoBase64: "" // CRITICAL FIX: Ensure no logo is sent to Claude for now
            };
            
            log(`Generating design variation ${index + 1}: ${styleVariation}`, "generator");
            // Use Claude AI instead of Gemini for flyer generation (upgraded on April 29, 2025)
            // Claude 3.7 Sonnet is the latest model with enhanced image generation capabilities
            const screenshot = await renderFlyerFromClaude(variantOptions);
            successfulDesigns.push({
              imageBuffer: screenshot,
              style: styleVariation
            });
            
            // Minimal delay between requests to avoid hitting rate limits
            if (index < styleVariations.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 50)); // Reduced delay from 200ms to 50ms
            }
          } catch (error) {
            log(`Error generating design variation ${index + 1}: ${error}`, "generator");
            // If this is a quota error, stop trying more variations
            const errorMessage = String(error);
            if (errorMessage.includes("API quota limit reached") || errorMessage.includes("429 Too Many Requests")) {
              log("Stopping design generation due to API quota limits", "generator");
              break;
            }
          }
        }
      }
      
      if (successfulDesigns.length === 0) {
        throw new Error("All design generation attempts failed");
      }
      
      log(`Successfully generated ${successfulDesigns.length} design variations`, "generator");
      
      // Create a response with all design images
      const designData = successfulDesigns.map((design, index) => {
        try {
          // An important discovery - sometimes the buffers might not be properly encoded
          // So we make sure to handle them consistently
          
          // Step 1: Ensure we have a valid Buffer
          const imageBuffer = Buffer.isBuffer(design.imageBuffer) 
            ? design.imageBuffer 
            : Buffer.from(design.imageBuffer);
          
          // Step 2: Convert to base64 properly
          const base64Data = imageBuffer.toString('base64');
          log(`Design ${index + 1} - Base64 length: ${base64Data.length}`, "generator");
          
          // Evaluate the first few bytes to determine what kind of image we have
          const firstByte = imageBuffer[0];
          const secondByte = imageBuffer[1];
          
          // JPEG usually starts with FF D8
          // PNG usually starts with 89 50 4E 47
          const isJpeg = firstByte === 0xFF && secondByte === 0xD8;
          const isPng = firstByte === 0x89 && secondByte === 0x50;
          
          log(`Design ${index + 1} is ${isJpeg ? 'JPEG' : isPng ? 'PNG' : 'Unknown image format'}`, "generator");
          
          // Step 3: Create proper data URL with correct MIME type
          const mimeType = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : 'image/jpeg'; // Default to JPEG
          return {
            imageBase64: `data:${mimeType};base64,${base64Data}`,
            style: design.style,
            id: index + 1
          };
        } catch (error) {
          log(`Error processing design ${index + 1}: ${error}`, "generator");
          // Provide fallback SVG that is guaranteed to work
          const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="#4337fe"/><text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dy=".3em">Design ${index + 1}</text></svg>`;
          const svgBase64 = Buffer.from(svgContent).toString('base64');
          return {
            imageBase64: `data:image/svg+xml;base64,${svgBase64}`,
            style: design.style,
            id: index + 1
          };
        }
      });
      
      log("AI Flyer generation completed", "generator");
      log(`Successfully prepared ${designData.length} designs for response`, "generator");
      
      // Debug logging to ensure the response has the correct format
      log(`First design - ID: ${designData[0]?.id}, Style: ${designData[0]?.style}, Has ImageBase64: ${!!designData[0]?.imageBase64}`, "generator");
      
      // Subtract credits for the successful generation based on how many designs were generated
      await storage.addCreditsTransaction({
        user_id: userId,
        amount: totalRequiredCredits,
        transaction_type: 'subtract',
        description: `Generated ${successfulDesigns.length} flyer designs`
      });
      
      // Get updated user info
      const updatedUser = await storage.getUser(userId);
      
      // Create the response object
      const responseData = { 
        designs: designData,
        credits: {
          balance: updatedUser?.credits_balance,
          used: totalRequiredCredits
        }
      };
      
      log(`Sending response with ${responseData.designs.length} designs`, "generator");
      
      // Send JSON response with all designs and updated credit info
      res.json(responseData);
    } catch (error) {
      log(`Error generating AI flyer: ${error}`, "generator");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Handle API quota limit errors
      if (errorMessage.includes("API quota limit reached")) {
        // Send 429 Too Many Requests status code for quota limit errors
        res.status(429).json({ 
          message: errorMessage.replace("Gemini AI", "Claude AI"),
          quotaExceeded: true
        });
      } else {
        // Send 500 Internal Server Error for other errors
        res.status(500).json({ message: `Failed to generate AI flyer: ${errorMessage}` });
      }
    }
  });

  // Legacy API endpoint to generate a flyer with uploaded image
  app.post(
    "/api/generate",
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        log("Flyer generation started", "generator");

        // Debug request
        log(`Request body keys: ${Object.keys(req.body).join(", ")}`, "generator");
        log(`Files: ${req.file ? "Yes" : "No"}`, "generator");

        // Validate request
        if (!req.file) {
          return res.status(400).json({ message: "Image file is required" });
        }

        const { prompt, headline, content, template } = req.body;

        if (!headline) {
          return res.status(400).json({ message: "Headline is required" });
        }

        // Save the uploaded image to a temporary file
        const tempDir = path.resolve(process.cwd(), "temp");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const imagePath = path.join(tempDir, `upload-${Date.now()}-${req.file.originalname}`);
        fs.writeFileSync(imagePath, req.file.buffer);

        log(`Image saved to: ${imagePath}`, "generator");

        // Generate the flyer
        const screenshot = await generateFlyer({
          imageUrl: imagePath,
          prompt: prompt || "",
          headline: headline,
          content: content || "",
          template: template || "default",
        });

        // Remove the temporary image file
        fs.unlinkSync(imagePath);

        log("Flyer generation completed", "generator");

        // Send the screenshot as response
        res.contentType("image/png");
        res.send(screenshot);
      } catch (error) {
        log(`Error generating flyer: ${error}`, "generator");
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ message: `Failed to generate flyer: ${errorMessage}` });
      }
    }
  );

  // Add a test route to verify server is working
  app.get("/api/test", (req: Request, res: Response) => {
    res.json({ status: "ok", message: "Server is running correctly" });
  });
  
  // Add a test route to verify Claude API is working
  app.get("/api/test-claude", async (req: Request, res: Response) => {
    try {
      // Import Anthropic directly here to avoid the need for top-level import
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      
      // Test the API with a simple request
      log("Testing Claude API connection...", "claude");
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 100,
        messages: [{ role: "user", content: "Say hello in JSON format please" }],
        system: "You are a helpful assistant. Always respond with valid JSON only."
      });
      
      // Check for valid response
      const content = response.content[0];
      const text = 'text' in content ? content.text : JSON.stringify(content);
      log(`Claude API test response: ${text}`, "claude");
      
      res.json({ 
        status: "ok", 
        message: "Claude API is working correctly",
        sample_response: text
      });
    } catch (error) {
      log(`Claude API test error: ${error}`, "claude");
      res.status(500).json({ 
        status: "error", 
        message: `Claude API test failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });
  
  // Credits and design configurations API endpoints
  
  // Get user's credits balance and history
  app.get("/api/credits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get credit transaction history
      const creditHistory = await storage.getUserCreditsHistory(userId);
      
      res.json({
        balance: user.credits_balance,
        is_premium: user.is_premium,
        history: creditHistory
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to get credits info: ${errorMessage}` });
    }
  });
  
  // Add credits to user's account (this would typically be connected to a payment system)
  app.post("/api/credits/add", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { amount, description } = req.body;
      
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }
      
      // Add credits transaction
      const transaction = await storage.addCreditsTransaction({
        user_id: userId,
        amount: amount,
        transaction_type: 'add',
        description: description || 'Credits added'
      });
      
      // Get updated user info
      const updatedUser = await storage.getUser(userId);
      
      res.json({
        transaction: transaction,
        new_balance: updatedUser?.credits_balance
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to add credits: ${errorMessage}` });
    }
  });
  
  // Special endpoint to add 500 credits to a specific user once 
  // (activated by a special ID to prevent abuse)
  app.post("/api/credits/bonus", async (req: Request, res: Response) => {
    try {
      const { userId, bonusCode } = req.body;
      
      // Validate the bonus code (simple security measure)
      if (bonusCode !== "e0938fd1-3c50-4dc5-b165-17acd928253e") {
        return res.status(403).json({ message: "Invalid bonus code" });
      }
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Find the user by ID
      const user = await storage.getUserByFirebaseUid(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Add 500 credits
      const transaction = await storage.addCreditsTransaction({
        user_id: user.id,
        amount: 500,
        transaction_type: 'add',
        description: 'Special one-time bonus credits'
      });
      
      // Get updated user info
      const updatedUser = await storage.getUser(user.id);
      
      res.json({
        success: true,
        message: "500 bonus credits added successfully",
        new_balance: updatedUser?.credits_balance
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to add bonus credits: ${errorMessage}` });
    }
  });
  
  // Get available design configurations for the user
  app.get("/api/design-configs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const configs = await storage.getDesignConfigs(userId);
      
      res.json({
        configs: configs
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to get design configurations: ${errorMessage}` });
    }
  });
  
  // Create a new design configuration
  app.post("/api/design-configs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const validationResult = insertDesignConfigSchema.safeParse({
        ...req.body,
        user_id: userId
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: validationResult.error.format() 
        });
      }
      
      const config = await storage.createDesignConfig(validationResult.data);
      
      res.status(201).json(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to create design configuration: ${errorMessage}` });
    }
  });
  
  // Update a design configuration
  app.put("/api/design-configs/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const configId = parseInt(req.params.id);
      
      if (isNaN(configId)) {
        return res.status(400).json({ message: "Invalid configuration ID" });
      }
      
      // Check if the config exists and belongs to the user
      const existingConfig = await storage.getDesignConfig(configId);
      
      if (!existingConfig) {
        return res.status(404).json({ message: "Design configuration not found" });
      }
      
      if (existingConfig.user_id !== userId && existingConfig.user_id !== 0) {
        return res.status(403).json({ message: "You don't have permission to update this configuration" });
      }
      
      // System configs (user_id = 0) cannot be updated by normal users
      if (existingConfig.user_id === 0) {
        return res.status(403).json({ message: "System configurations cannot be modified" });
      }
      
      // Update the config
      const updatedConfig = await storage.updateDesignConfig(configId, {
        ...req.body,
        user_id: userId // Ensure user_id remains the same
      });
      
      res.json(updatedConfig);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to update design configuration: ${errorMessage}` });
    }
  });

  // Authentication Routes

  // Firebase Authentication - create or update user from Firebase
  app.post("/api/auth/firebase", async (req: Request, res: Response) => {
    try {
      // Log the headers to debug
      console.log("Request headers:", req.headers);
      
      const { uid, email, displayName } = req.body;
      
      // Log the Firebase auth details
      console.log("Firebase auth details:", { uid, email, displayName });
      
      if (!uid) {
        return res.status(400).json({ message: "Firebase UID is required" });
      }
      
      // Check if user already exists by firebase_uid
      let user = await storage.getUserByFirebaseUid(uid);
      console.log("User from Firebase UID lookup:", user ? user.id : "Not found");
      
      if (user) {
        // User exists, login
        req.login(user, (loginErr) => {
          if (loginErr) {
            console.error("Login error:", loginErr);
            return res.status(500).json({ message: "Login failed" });
          }
          console.log("User logged in successfully:", user!.id);
          
          // Log session to debug
          console.log("Session after login:", req.session);
          
          return res.json({
            id: user!.id,
            username: user!.username,
            email: user!.email
          });
        });
      } else {
        // User doesn't exist, create new user
        const username = email ? email.split('@')[0] : `user_${Date.now()}`;
        console.log("Creating new user with username:", username);
        
        const newUser = await storage.createUser({
          username,
          email: email || null,
          password: '', // No password for Firebase users
          firebase_uid: uid,
          display_name: displayName || username
        });
        
        console.log("New user created:", newUser.id);
        
        // Log in the new user
        req.login(newUser, (loginErr) => {
          if (loginErr) {
            console.error("Login error after user creation:", loginErr);
            return res.status(500).json({ message: "Login failed after user creation" });
          }
          console.log("New user logged in successfully");
          
          // Log session to debug
          console.log("Session after new user login:", req.session);
          
          return res.status(201).json({
            id: newUser.id,
            username: newUser.username,
            email: newUser.email
          });
        });
      }
    } catch (error) {
      console.error("Firebase auth error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Firebase authentication failed: ${errorMessage}` });
    }
  });
  
  // Register a new user
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validationResult = insertUserSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: validationResult.error.format() 
        });
      }
      
      const { username, password } = validationResult.data;
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash the password before storing
      const hashedPassword = await hashPassword(password);
      
      // Create new user with hashed password
      const newUser = await storage.createUser({
        username,
        password: hashedPassword
      });
      
      // Return user data (excluding password)
      res.status(201).json({
        id: newUser.id,
        username: newUser.username
      });
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Registration failed: ${errorMessage}` });
    }
  });
  
  // Login
  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: Error | null, user: any, info: { message: string }) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Authentication failed" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        // Return user data (excluding password)
        return res.json({
          id: user.id,
          username: user.username
        });
      });
    })(req, res, next);
  });
  
  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  // Check authenticated user
  app.get("/api/auth/user", (req: Request, res: Response) => {
    if (req.isAuthenticated() && req.user) {
      const user = req.user as any;
      return res.json({
        id: user.id,
        username: user.username
      });
    }
    res.status(401).json({ message: "Not authenticated" });
  });

  // User Creations API endpoints
  
  // Get all creations for the logged-in user
  app.get("/api/creations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Strict filtering by user ID to ensure privacy
      const creations = await storage.getUserCreations(userId);
      
      res.json({
        creations: creations
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to get user creations: ${errorMessage}` });
    }
  });
  
  // Get a specific creation by ID - mit verbesserter Datenschutzfilterung
  app.get("/api/creations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const creationId = parseInt(req.params.id);
      if (isNaN(creationId)) {
        return res.status(400).json({ message: "Invalid creation ID" });
      }
      
      // Direkt die Benutzer-ID an die Storage-Methode übergeben für strikte Filterung
      // Dies gibt nur Kreationen zurück, die wirklich zum angegebenen Benutzer gehören
      const creation = await storage.getUserCreation(creationId, userId);
      
      // Wenn nicht gefunden oder nicht zum Benutzer gehörend, 404 zurückgeben
      if (!creation) {
        return res.status(404).json({ message: "Creation not found" });
      }
      
      res.json(creation);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to get creation: ${errorMessage}` });
    }
  });
  
  // Save a new creation
  app.post("/api/creations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      
      // Validate request data
      const validationResult = insertUserCreationSchema.safeParse({
        ...req.body,
        user_id: userId
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: validationResult.error.format() 
        });
      }
      
      // Create the user creation
      const creation = await storage.createUserCreation(validationResult.data);
      
      res.status(201).json(creation);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to save creation: ${errorMessage}` });
    }
  });
  
  // Update a creation - mit verbesserter Datenschutzfilterung
  app.put("/api/creations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const creationId = parseInt(req.params.id);
      if (isNaN(creationId)) {
        return res.status(400).json({ message: "Invalid creation ID" });
      }
      
      // Ensure user_id cannot be changed and is always set to current user
      const updateData = {
        ...req.body,
        user_id: userId // Force the user_id to the authenticated user
      };
      
      // Direkt die userId an die updateUserCreation-Methode übergeben
      // Diese prüft, ob die Kreation zum Benutzer gehört und verhindert, dass andere Benutzer
      // die Daten ändern können
      const updatedCreation = await storage.updateUserCreation(creationId, updateData, userId);
      
      // Wenn keine Kreation gefunden wurde oder sie nicht zum Benutzer gehört
      if (!updatedCreation) {
        return res.status(404).json({ message: "Creation not found" });
      }
      
      res.json(updatedCreation);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to update creation: ${errorMessage}` });
    }
  });
  
  // Delete a creation - mit verbesserter Datenschutzfilterung
  app.delete("/api/creations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const creationId = parseInt(req.params.id);
      if (isNaN(creationId)) {
        return res.status(400).json({ message: "Invalid creation ID" });
      }
      
      // Direkt die userId an die deleteUserCreation-Methode übergeben
      // Diese prüft, ob die Kreation existiert und zum Benutzer gehört, bevor sie gelöscht wird
      const deleted = await storage.deleteUserCreation(creationId, userId);
      
      if (deleted) {
        res.status(204).end();
      } else {
        // 404 statt 403 für bessere Sicherheit - nicht preisgeben, dass die Ressource existiert
        res.status(404).json({ message: "Creation not found" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to delete creation: ${errorMessage}` });
    }
  });
  
  // Brand Kit API routes
  
  // Get all brand kits for the authenticated user
  app.get("/api/brand-kits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const brandKits = await storage.getBrandKits(userId);
      
      res.json({ brandKits });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to get brand kits: ${errorMessage}` });
    }
  });
  
  // Get the active brand kit for the user
  app.get("/api/brand-kits/active", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const activeBrandKit = await storage.getActiveBrandKit(userId);
      
      if (!activeBrandKit) {
        return res.status(404).json({ message: "No active brand kit found" });
      }
      
      res.json({ brandKit: activeBrandKit });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to get active brand kit: ${errorMessage}` });
    }
  });
  
  // Deactivate the current brand kit
  app.post("/api/brand-kits/deactivate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const activeBrandKit = await storage.getActiveBrandKit(userId);
      
      if (!activeBrandKit) {
        return res.status(404).json({ message: "No active brand kit found" });
      }
      
      // Update the brand kit to be inactive
      const updatedBrandKit = await storage.updateBrandKit(
        activeBrandKit.id, 
        { is_active: false },
        userId
      );
      
      res.json({ success: true, brandKit: updatedBrandKit });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to deactivate brand kit: ${errorMessage}` });
    }
  });
  
  // Get a specific brand kit by ID
  app.get("/api/brand-kits/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const brandKitId = parseInt(req.params.id);
      if (isNaN(brandKitId)) {
        return res.status(400).json({ message: "Invalid brand kit ID" });
      }
      
      const userId = (req.user as any).id;
      const brandKit = await storage.getBrandKit(brandKitId, userId);
      
      if (!brandKit) {
        return res.status(404).json({ message: "Brand kit not found or not owned by user" });
      }
      
      res.json({ brandKit });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to get brand kit: ${errorMessage}` });
    }
  });
  
  // Create a new brand kit for the user
  app.post("/api/brand-kits", isAuthenticated, uploadFields, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      
      // Parse request body
      const result = insertBrandKitSchema.safeParse({
        ...req.body,
        user_id: userId
      });
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid brand kit data", 
          errors: result.error.format() 
        });
      }
      
      // Handle logo upload if provided
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let logoUrl = req.body.logo_url;
      
      if (files && files.logo && files.logo[0]) {
        // In a real app, you'd upload this to cloud storage
        // For now, we'll convert to base64 and store in the database
        const logoBase64 = `data:${files.logo[0].mimetype};base64,${files.logo[0].buffer.toString('base64')}`;
        logoUrl = logoBase64;
      }
      
      // Create the brand kit
      const brandKit = await storage.createBrandKit({
        ...result.data,
        logo_url: logoUrl
      });
      
      res.status(201).json({ brandKit });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to create brand kit: ${errorMessage}` });
    }
  });
  
  // Update an existing brand kit
  app.put("/api/brand-kits/:id", isAuthenticated, uploadFields, async (req: Request, res: Response) => {
    try {
      const brandKitId = parseInt(req.params.id);
      if (isNaN(brandKitId)) {
        return res.status(400).json({ message: "Invalid brand kit ID" });
      }
      
      const userId = (req.user as any).id;
      
      // Check if brand kit exists and belongs to user
      const existingBrandKit = await storage.getBrandKit(brandKitId, userId);
      if (!existingBrandKit) {
        return res.status(404).json({ message: "Brand kit not found or not owned by user" });
      }
      
      // Handle logo upload if provided
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let logoUrl = req.body.logo_url;
      
      if (files && files.logo && files.logo[0]) {
        // In a real app, you'd upload this to cloud storage
        // For now, we'll convert to base64 and store in the database
        const logoBase64 = `data:${files.logo[0].mimetype};base64,${files.logo[0].buffer.toString('base64')}`;
        logoUrl = logoBase64;
      }
      
      // Update the brand kit
      const updatedBrandKit = await storage.updateBrandKit(
        brandKitId,
        {
          ...req.body,
          logo_url: logoUrl || undefined
        },
        userId
      );
      
      res.json({ brandKit: updatedBrandKit });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to update brand kit: ${errorMessage}` });
    }
  });
  
  // Delete a brand kit
  app.delete("/api/brand-kits/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const brandKitId = parseInt(req.params.id);
      if (isNaN(brandKitId)) {
        return res.status(400).json({ message: "Invalid brand kit ID" });
      }
      
      const userId = (req.user as any).id;
      
      // Check if brand kit exists and belongs to user
      const brandKit = await storage.getBrandKit(brandKitId, userId);
      if (!brandKit) {
        return res.status(404).json({ message: "Brand kit not found or not owned by user" });
      }
      
      // Delete the brand kit
      const success = await storage.deleteBrandKit(brandKitId, userId);
      
      if (success) {
        res.json({ message: "Brand kit deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete brand kit" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to delete brand kit: ${errorMessage}` });
    }
  });
  
  // Stripe payment integration endpoints
  
  // Create a checkout session for Stripe payment
  app.post("/api/stripe/create-checkout", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { packageType, successUrl, cancelUrl } = req.body;
      
      // Validate required fields
      if (!packageType || !successUrl || !cancelUrl) {
        return res.status(400).json({ 
          message: "Missing required fields: packageType, successUrl, or cancelUrl" 
        });
      }
      
      // Get user to retrieve firebase UID
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create checkout session
      const checkoutUrl = await createCheckoutSession(
        userId.toString(),
        user.firebase_uid || '',
        packageType,
        successUrl,
        cancelUrl
      );
      
      res.json({ url: checkoutUrl });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to create checkout session: ${errorMessage}` });
    }
  });
  
  // Verify successful payment and add credits to user account
  app.post("/api/stripe/verify-payment", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }
      
      // Verify the session
      const verification = await verifyCheckoutSession(sessionId);
      
      if (!verification.success) {
        return res.status(400).json({ message: "Payment verification failed" });
      }
      
      // Convert string user ID to number
      const userId = parseInt(verification.userId, 10);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID in session" });
      }
      
      // Add credits transaction
      const transaction = await storage.addCreditsTransaction({
        user_id: userId,
        amount: verification.credits,
        transaction_type: 'add',
        description: `${verification.packageType} Package purchase`
      });
      
      // Get updated user info
      const updatedUser = await storage.getUser(userId);
      
      res.json({
        success: true,
        transaction: transaction,
        credits: updatedUser?.credits_balance
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Payment verification failed: ${errorMessage}` });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
