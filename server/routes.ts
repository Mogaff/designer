import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import fs from "fs";
import { generateFlyer } from "./flyerGenerator";
import { renderFlyerFromGemini } from "./geminiFlyer";
import multer from "multer";
import { log } from "./vite";
import { setupAuth } from "./auth";
import { v4 as uuidv4 } from "uuid";

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
  // Setup authentication routes
  setupAuth(app);
  // API endpoint to generate a flyer using Gemini AI
  app.post("/api/generate-ai", uploadFields, async (req: Request, res: Response) => {
    // Set timeout for the request (45 seconds)
    req.setTimeout(45000);
    
    // Use a timeout to catch hung requests
    let isResponseSent = false;
    const requestTimeout = setTimeout(() => {
      if (!isResponseSent) {
        isResponseSent = true;
        log("Request timed out for AI flyer generation", "generator");
        res.status(504).json({ 
          message: "Flyer generation timed out. Please try again with a simpler prompt or fewer images."
        });
      }
    }, 40000); // 40 seconds timeout
    
    try {
      log("AI Flyer generation started", "generator");
      
      const { prompt } = req.body;
      
      if (!prompt) {
        clearTimeout(requestTimeout);
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
      
      // Generate the flyer using Gemini AI with timeout handling
      const screenshot = await renderFlyerFromGemini(generationOptions);
      
      log("AI Flyer generation completed", "generator");
      
      // Clear the timeout since we completed successfully
      clearTimeout(requestTimeout);
      
      if (!isResponseSent) {
        isResponseSent = true;
        // Send the screenshot as response
        res.contentType("image/png");
        res.send(screenshot);
      }
    } catch (error) {
      log(`Error generating AI flyer: ${error}`, "generator");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Clear the timeout
      clearTimeout(requestTimeout);
      
      if (!isResponseSent) {
        isResponseSent = true;
        
        // Handle API quota limit errors
        if (errorMessage.includes("API quota limit reached")) {
          // Send 429 Too Many Requests status code for quota limit errors
          res.status(429).json({ 
            message: errorMessage,
            quotaExceeded: true
          });
        } else if (errorMessage.includes("timed out")) {
          // Handle timeout errors
          res.status(504).json({
            message: "The request timed out. Please try again with a simpler prompt or fewer images."
          });
        } else {
          // Send 500 Internal Server Error for other errors
          res.status(500).json({ message: `Failed to generate AI flyer: ${errorMessage}` });
        }
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

  // API endpoint to save a generated flyer
  app.post("/api/save-flyer", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to save flyers" });
      }
      
      const { imageUrl, headline, content, stylePrompt, template } = req.body;
      
      if (!imageUrl) {
        return res.status(400).json({ message: "Flyer image is required" });
      }
      
      // Save the flyer to the database
      const flyer = await storage.createFlyer({
        id: uuidv4(),
        userId: req.user.id,
        imageUrl,
        headline: headline || "",
        content: content || "",
        stylePrompt: stylePrompt || "",
        template: template || "default",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      res.status(201).json(flyer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to save flyer: ${errorMessage}` });
    }
  });
  
  // API endpoint to get user's saved flyers
  app.get("/api/my-flyers", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to view your flyers" });
      }
      
      // Get the user's flyers from the database
      const flyers = await storage.getUserFlyers(req.user.id);
      
      res.status(200).json(flyers);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to retrieve flyers: ${errorMessage}` });
    }
  });

  // Add a test route to verify server is working
  app.get("/api/test", (req: Request, res: Response) => {
    res.json({ status: "ok", message: "Server is running correctly" });
  });

  const httpServer = createServer(app);

  return httpServer;
}
