import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import fs from "fs";
import { generateFlyer } from "./flyerGenerator";
import { renderFlyerFromGemini } from "./geminiFlyer";
import multer from "multer";
import { log } from "./vite";
import passport from "./auth";
import { hashPassword, isAuthenticated } from "./auth";
import { insertUserSchema } from "@shared/schema";

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
  { name: 'backgroundImage', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]);

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint to generate multiple flyer designs using Gemini AI
  app.post("/api/generate-ai", uploadFields, async (req: Request, res: Response) => {
    try {
      log("AI Flyer generation started", "generator");
      
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      log(`Generating AI flyer with prompt: ${prompt}`, "generator");
      
      // Generate options for Gemini
      const generationOptions: { 
        prompt: string; 
        backgroundImageBase64?: string;
        logoBase64?: string;
      } = {
        prompt: prompt
      };
      
      // Add images to options if provided (using type assertion for files)
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (files && files.backgroundImage && files.backgroundImage[0]) {
        log("Background image received for AI generation", "generator");
        const backgroundImageBase64 = files.backgroundImage[0].buffer.toString('base64');
        generationOptions.backgroundImageBase64 = backgroundImageBase64;
      }
      
      if (files && files.logo && files.logo[0]) {
        log("Logo image received for AI generation", "generator");
        const logoBase64 = files.logo[0].buffer.toString('base64');
        generationOptions.logoBase64 = logoBase64;
      }
      
      // Generate 4 design variations with slightly different style instructions
      const styleVariations = [
        "with a bold, high-contrast style",
        "with a minimal, elegant style",
        "with a creative, artistic style",
        "with a professional, corporate style"
      ];
      
      // Generate designs sequentially to avoid quota limits
      log("Generating design variations", "generator");
      const successfulDesigns = [];
      
      // Try each style variation until we have up to 4 successful designs
      for (let index = 0; index < styleVariations.length && successfulDesigns.length < 4; index++) {
        const styleVariation = styleVariations[index];
        try {
          const variantOptions = {
            ...generationOptions,
            prompt: `${generationOptions.prompt} ${styleVariation}`
          };
          
          log(`Generating design variation ${index + 1}: ${styleVariation}`, "generator");
          const screenshot = await renderFlyerFromGemini(variantOptions);
          successfulDesigns.push({
            imageBuffer: screenshot,
            style: styleVariation
          });
          
          // Add a slight delay between requests to avoid hitting rate limits
          if (index < styleVariations.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
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
      
      // Send JSON response with all designs
      res.json({ designs: designData });
    } catch (error) {
      log(`Error generating AI flyer: ${error}`, "generator");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Handle API quota limit errors
      if (errorMessage.includes("API quota limit reached")) {
        // Send 429 Too Many Requests status code for quota limit errors
        res.status(429).json({ 
          message: errorMessage,
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

  // Authentication Routes
  
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

  const httpServer = createServer(app);

  return httpServer;
}
