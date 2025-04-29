import { fal } from "@fal-ai/client";
import { Request, Response } from "express";
import { storage } from "./storage";
import { log } from "./vite";

// Configure the FAL client with the API key from environment variables
fal.config({
  credentials: process.env.FAL_KEY
});

// Define custom image size type to match Flux API
type FluxImageSize = 
  | "square_hd" 
  | "square" 
  | "portrait_4_3" 
  | "portrait_16_9" 
  | "landscape_4_3" 
  | "landscape_16_9"
  | { width: number; height: number };

interface FluxImageOptions {
  prompt: string;
  imageSize?: FluxImageSize;
  numInferenceSteps?: number;
  seed?: number;
}

/**
 * Generate an image using Flux API based on the prompt
 * @param options Options for image generation
 * @returns URL of the generated image
 */
export async function generateBackgroundImage(options: FluxImageOptions): Promise<string> {
  try {
    log("Generating background image with Flux API: " + options.prompt, "flux");
    
    // Set defaults if not provided
    const imageSize = options.imageSize || "landscape_4_3";
    const numInferenceSteps = options.numInferenceSteps || 4;
    
    // Call the Flux API
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: options.prompt,
        image_size: imageSize,
        num_inference_steps: numInferenceSteps,
        seed: options.seed,
        num_images: 1,
        enable_safety_checker: true
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(message => {
            console.log(message);
          });
        }
      },
    });
    
    if (!result.data || !result.data.images || result.data.images.length === 0) {
      throw new Error("No images generated");
    }
    
    log("Successfully generated image with Flux API", "flux");
    
    // Return the URL of the first image
    return result.data.images[0].url;
  } catch (error) {
    console.error("Error generating background image with Flux API:", error);
    throw error;
  }
}

/**
 * Express route handler for generating background images
 */
export async function generateBackgroundImageHandler(req: Request, res: Response) {
  try {
    // Get the user ID from the authenticated user
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Retrieve user to check credits
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if user has enough credits (costs 1 credit)
    if (user.credits_balance < 1) {
      return res.status(403).json({ error: "Not enough credits" });
    }
    
    // Get the prompt from the request body
    const { prompt, imageSize } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }
    
    // Generate the image
    const imageUrl = await generateBackgroundImage({
      prompt,
      imageSize: imageSize as FluxImageSize
    });
    
    // Deduct 1 credit from the user
    await storage.updateUserCredits(userId, user.credits_balance - 1);
    
    // Add credits transaction
    await storage.addCreditsTransaction({
      user_id: userId,
      amount: -1,
      transaction_type: 'subtract',
      description: "Background image generation with Flux AI"
    });
    
    log(`Successfully generated background image for user ${userId}`, "flux");
    
    // Return the image URL
    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("Error in generateBackgroundImageHandler:", error);
    return res.status(500).json({ error: "Failed to generate background image" });
  }
}