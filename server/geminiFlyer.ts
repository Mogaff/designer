import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { log } from "./vite";
import puppeteer from "puppeteer";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

// Initialize the Gemini AI with the API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

type GeminiResponse = {
  htmlContent: string;
  cssStyles: string;
};

interface GenerationOptions {
  prompt: string;
  imageBase64?: string;
}

/**
 * Generate HTML and CSS for a flyer based on a prompt using Gemini AI
 */
export async function generateFlyerContent(options: GenerationOptions): Promise<GeminiResponse> {
  log("Generating flyer content with Gemini AI", "gemini");
  
  try {
    // Create a comprehensive prompt for the AI with enhanced design instructions
    const systemPrompt = `You are an award-winning graphic designer and web developer who creates stunning, visually exciting flyers using modern web technologies. You specialize in creating visually striking designs with bold typography, creative layouts, and innovative use of color.
    
    Create an exceptionally creative and professional flyer using Tailwind CSS and modern design techniques based on the following prompt:
    "${options.prompt}"
    
    Your design should:
    1. Use Tailwind CSS with creative, non-conventional layouts - avoid boring grid layouts and basic designs
    2. Implement bold, eye-catching typography with font combinations that create visual hierarchy
    3. Use gradients, overlays, and creative backgrounds that feel modern and professional
    4. Incorporate creative use of shapes, diagonal elements, and asymmetrical layouts
    5. Include subtle animations using CSS where appropriate (hover effects, etc.)
    6. Make the design feel like it was created by a professional graphic designer
    7. Incorporate striking visual elements like creative dividers, cut-out shapes or perspective effects
    8. Use a bold, modern color palette with thoughtful color theory
    9. Draw inspiration from award-winning poster designs and current design trends
    
    Absolutely avoid:
    - Boring, templated layouts with basic grids
    - Outdated or generic design elements
    - Flat, uninteresting color schemes
    - Basic rectangular layouts and standard columns
    
    Return your response in the following JSON format:
    {
      "htmlContent": "the complete HTML code for the flyer",
      "cssStyles": "any custom CSS styles needed to create advanced effects"
    }`;

    // Create parts for the generation
    const parts: Part[] = [{ text: systemPrompt }];
    
    // Add image to the parts if provided
    if (options.imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: options.imageBase64
        }
      });
      
      // Add explicit instructions to use the image as background
      parts.push({
        text: "IMPORTANT: Use the provided image as the BACKGROUND of your flyer design. Do not try to reference it with an img tag - I will handle embedding it for you. Instead, directly create HTML that assumes the image is already the background. Use appropriate text colors that contrast well with the image's colors. Add overlays or semi-transparent elements as needed to maintain text readability over the background image."
      });
    }

    // Generate content using Gemini
    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonContent = JSON.parse(jsonMatch[0]);
        return {
          htmlContent: jsonContent.htmlContent || "",
          cssStyles: jsonContent.cssStyles || ""
        };
      }
    } catch (parseError) {
      log(`Error parsing Gemini JSON response: ${parseError}`, "gemini");
    }
    
    // Fallback: Try to extract HTML content manually
    const htmlMatch = text.match(/<html[^>]*>[\s\S]*<\/html>/i);
    if (htmlMatch) {
      return {
        htmlContent: htmlMatch[0],
        cssStyles: ""
      };
    }
    
    throw new Error("Could not extract valid HTML from the Gemini response");
  } catch (error) {
    log(`Error generating content with Gemini: ${error}`, "gemini");
    throw error;
  }
}

/**
 * Render the Gemini-generated flyer content and take a screenshot
 */
export async function renderFlyerFromGemini(options: GenerationOptions): Promise<Buffer> {
  log("Starting Gemini-powered flyer generation", "gemini");
  
  try {
    // Generate the flyer content using Gemini AI
    const { htmlContent, cssStyles } = await generateFlyerContent(options);
    
    // Create a complete HTML document with the generated content
    // Add background image styling if an image was provided
    const backgroundStyle = options.imageBase64 
      ? `
          body {
            margin: 0;
            padding: 0;
            background-image: url('data:image/jpeg;base64,${options.imageBase64}');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            min-height: 100vh;
          }
        `
      : `
          body {
            margin: 0;
            padding: 0;
          }
        `;
        
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gemini Generated Flyer</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                animation: {
                  'gradient': 'gradient 8s ease infinite',
                  'float': 'float 6s ease-in-out infinite',
                  'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                },
                keyframes: {
                  gradient: {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                  },
                  float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                  }
                }
              }
            }
          }
        </script>
        <style>
          ${backgroundStyle}
          
          /* Advanced effects */
          .gradient-text {
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
            background-image: linear-gradient(to right, var(--tw-gradient-stops));
          }
          .gradient-bg {
            background-size: 200% 200%;
            animation: gradient 15s ease infinite;
          }
          ${cssStyles}
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;
    
    // Save the HTML to a temporary file
    const tempDir = path.resolve(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const htmlPath = path.join(tempDir, `gemini-flyer-${Date.now()}.html`);
    fs.writeFileSync(htmlPath, fullHtml);
    log(`Saved generated HTML to: ${htmlPath}`, "gemini");
    
    // Get Chromium executable path
    const { stdout: chromiumPath } = await execAsync("which chromium");
    log(`Found Chromium at: ${chromiumPath.trim()}`, "gemini");
    
    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox", 
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ],
      executablePath: chromiumPath.trim(),
    });
    
    try {
      const page = await browser.newPage();
      
      // Set a good viewport size for a flyer
      await page.setViewport({
        width: 800,
        height: 1200,
        deviceScaleFactor: 2,
      });
      
      // Load the HTML file
      await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
      
      // Take screenshot
      log("Taking screenshot of the Gemini-generated flyer", "gemini");
      const screenshot = await page.screenshot({
        type: "png",
        fullPage: true,
      });
      
      // Convert Uint8Array to Buffer
      const buffer = Buffer.from(screenshot);
      
      // Clean up the temporary HTML file
      fs.unlinkSync(htmlPath);
      
      return buffer;
      
    } finally {
      await browser.close();
      log("Puppeteer browser closed", "gemini");
    }
  } catch (error) {
    log(`Error in Gemini flyer generation: ${error}`, "gemini");
    throw error;
  }
}