import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import fs from "fs";
import { generateFlyer } from "./flyerGenerator";
import { renderFlyerFromGemini } from "./geminiFlyer";
import multer from "multer";
import { log } from "./vite";

// Using the built-in type definitions from @types/multer

// Set up multer storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint to generate a flyer using Gemini AI
  app.post("/api/generate-ai", upload.single("image"), async (req: Request, res: Response) => {
    try {
      log("AI Flyer generation started", "generator");
      
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      log(`Generating AI flyer with prompt: ${prompt}`, "generator");
      
      // Generate options for Gemini
      const generationOptions: { prompt: string; imageBase64?: string } = {
        prompt: prompt
      };
      
      // Add image to options if provided
      if (req.file) {
        log("Image file received for AI generation", "generator");
        const imageBase64 = req.file.buffer.toString('base64');
        generationOptions.imageBase64 = imageBase64;
      }
      
      // Generate the flyer using Gemini AI
      const screenshot = await renderFlyerFromGemini(generationOptions);
      
      log("AI Flyer generation completed", "generator");
      
      // Send the screenshot as response
      res.contentType("image/png");
      res.send(screenshot);
    } catch (error) {
      log(`Error generating AI flyer: ${error}`, "generator");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ message: `Failed to generate AI flyer: ${errorMessage}` });
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

  const httpServer = createServer(app);

  return httpServer;
}
