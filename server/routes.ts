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

// Using the built-in type definitions from @types/multer

// Set up multer storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Create a multer middleware that can handle multiple files
const uploadFields = upload.fields([
  { name: 'background_image', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]);

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize and register the AdBurst Factory routes
  registerAdBurstApiRoutes(app);
  
  // Add route for generating background images with Flux AI
  app.post("/api/generate-background", isAuthenticated, generateBackgroundImageHandler);
  
  // Serve the credits admin page
  app.get("/admin/credits", (req: Request, res: Response) => {
    res.sendFile(path.resolve(process.cwd(), "add-credits.html"));
  });
  // API endpoint to generate multiple flyer designs using Claude AI
  app.post("/api/generate-ai", isAuthenticated, uploadFields, async (req: Request, res: Response) => {
    try {
      log("AI Flyer generation started - Phase 1: Design Suggestions", "generator");
      
      const { prompt, configId, designCount, aspectRatio, templateInfo } = req.body;
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
      const numDesigns = parseInt(designCount) || 4;
      const maxDesigns = Math.min(Math.max(1, numDesigns), 4); // Ensure between 1 and 4
      
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
      
      // Calculate credits required based on number of designs
      const creditsPerDesign = designConfig.credits_per_design;
      const totalRequiredCredits = creditsPerDesign * maxDesigns;
      
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
      
      if (files && files.background_image && files.background_image[0]) {
        log("Background image received for AI generation", "generator");
        const backgroundImageBase64 = files.background_image[0].buffer.toString('base64');
        generationOptions.backgroundImageBase64 = backgroundImageBase64;
      }
      
      if (files && files.logo && files.logo[0]) {
        log("Logo image received for AI generation", "generator");
        const logoBase64 = files.logo[0].buffer.toString('base64');
        generationOptions.logoBase64 = logoBase64;
      }
      
      // Generate 4 design variations with distinct professional style instructions
      const styleVariations = [
        "with a luxury brand aesthetic using dramatic contrasts and premium typography",
        "with a modern minimalist style emphasizing elegant white space and refined typography",
        "with a creative high-fashion approach using artistic compositions and sophisticated color",
        "with a premium corporate look featuring polished visuals and architectural precision"
      ];
      
      // Generate designs sequentially to avoid quota limits
      log("Generating design variations", "generator");
      const successfulDesigns = [];
      
      // Try each style variation until we have the requested number of successful designs
      for (let index = 0; index < styleVariations.length && successfulDesigns.length < maxDesigns; index++) {
        const styleVariation = styleVariations[index];
        try {
          const variantOptions = {
            ...generationOptions,
            prompt: `${generationOptions.prompt} ${styleVariation}`,
            aspectRatio: aspectRatio,
            templateInfo: parsedTemplateInfo // Pass the template info to the render function
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
      
      if (successfulDesigns.length === 0) {
        throw new Error("All design generation attempts failed");
      }
      
      log(`Successfully generated ${successfulDesigns.length} design variations`, "generator");
      
      // Create a response with all design images
      const designData = successfulDesigns.map((design, index) => {
        // Convert buffer to base64 for JSON transport
        return {
          imageBase64: `data:image/png;base64,${design.imageBuffer.toString('base64')}`,
          style: design.style,
          id: index + 1
        };
      });
      
      log("AI Flyer generation completed", "generator");
      
      // Subtract credits for the successful generation based on how many designs were generated
      await storage.addCreditsTransaction({
        user_id: userId,
        amount: totalRequiredCredits,
        transaction_type: 'subtract',
        description: `Generated ${successfulDesigns.length} flyer designs`
      });
      
      // Get updated user info
      const updatedUser = await storage.getUser(userId);
      
      // Send JSON response with all designs and updated credit info
      res.json({ 
        designs: designData,
        credits: {
          balance: updatedUser?.credits_balance,
          used: totalRequiredCredits
        }
      });
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
      const text = response.content[0].text;
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
      const { uid, email, displayName } = req.body;
      
      if (!uid) {
        return res.status(400).json({ message: "Firebase UID is required" });
      }
      
      // Check if user already exists by firebase_uid
      let user = await storage.getUserByFirebaseUid(uid);
      
      if (user) {
        // User exists, login
        req.login(user, (loginErr) => {
          if (loginErr) {
            return res.status(500).json({ message: "Login failed" });
          }
          return res.json({
            id: user!.id,
            username: user!.username,
            email: user!.email
          });
        });
      } else {
        // User doesn't exist, create new user
        const username = email ? email.split('@')[0] : `user_${Date.now()}`;
        
        const newUser = await storage.createUser({
          username,
          email: email || null,
          password: '', // No password for Firebase users
          firebase_uid: uid,
          display_name: displayName || username
        });
        
        // Log in the new user
        req.login(newUser, (loginErr) => {
          if (loginErr) {
            return res.status(500).json({ message: "Login failed after user creation" });
          }
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
