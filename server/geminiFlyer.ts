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
  backgroundImageBase64?: string;
  logoBase64?: string;
  aspectRatio?: string;
}

/**
 * Generate HTML and CSS for a flyer based on a prompt using Gemini AI
 */
export async function generateFlyerContent(options: GenerationOptions): Promise<GeminiResponse> {
  log("Generating flyer content with Gemini AI", "gemini");
  
  try {
    // Create a comprehensive prompt for the AI with enhanced design instructions
    const systemPrompt = `You are an award-winning graphic designer who creates stunning, visually exciting flyers using modern web technologies. You specialize in creating visually striking designs with bold typography, creative layouts, and innovative use of color.
    
    Create an exceptionally creative and professional flyer using Tailwind CSS and modern design techniques based on the following prompt:
    "${options.prompt}"
    
    ${options.aspectRatio ? 
      `CRITICAL: This design is for the "${options.aspectRatio}" format. 
       Your design MUST use the ENTIRE CANVAS space from edge to edge, with content distributed throughout the entire area, not just in a small section. 
       Content must spread from top to bottom, left to right, using the full width and height available.` 
      : ''}
    
    Your design should:
    1. Use Tailwind CSS with creative, non-conventional layouts - avoid boring grid layouts and basic designs
    2. Implement bold, eye-catching typography with font combinations that create visual hierarchy
    3. Use gradients, overlays, and creative backgrounds that feel modern and professional
    4. Incorporate creative use of shapes and asymmetrical layouts
    5. Make the design feel like it was created by a professional graphic designer
    6. Incorporate striking visual elements like creative dividers and shapes
    7. Use a bold, modern color palette with thoughtful color theory
    8. Draw inspiration from award-winning poster designs and current design trends
    9. UTILIZE THE ENTIRE AVAILABLE SPACE from edge to edge - your design should fill the entire canvas
    10. Position elements throughout the entire canvas - don't cluster elements only at the top or center
    
    CRITICAL DESIGN REQUIREMENTS:
    1. DO NOT create any buttons or interactive elements - this is a print flyer, not a website
    2. DO NOT use rotated, diagonal, or slanted text - ALL text must be perfectly horizontal
    3. Keep all headings and text content perfectly straight (0 degree rotation)
    4. Use only straight text alignment (no diagonal text)
    5. Text can be left-aligned, right-aligned or centered, but never at an angle
    6. FILL THE ENTIRE CANVAS from top to bottom with your design - distribute elements across the entire available area
    7. DO NOT leave large empty spaces - ensure design elements extend to all edges of the canvas
    8. DO NOT cluster all content in just the top section - spread content throughout the entire height
    
    Absolutely avoid:
    - Buttons, clickable elements, or any web-only interactive components
    - Rotated, angled, or diagonal text of any kind
    - Boring, templated layouts with basic grids
    - Outdated or generic design elements
    - Flat, uninteresting color schemes
    - Basic rectangular layouts and standard columns
    - Designs that only use the top portion of the canvas
    - Layouts with excessive whitespace or empty areas
    
    Return your response in the following JSON format:
    {
      "htmlContent": "the complete HTML code for the flyer",
      "cssStyles": "any custom CSS styles needed to create advanced effects"
    }`;

    // Create parts for the generation
    const parts: Part[] = [{ text: systemPrompt }];
    
    // Add background image to the parts if provided
    if (options.backgroundImageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: options.backgroundImageBase64
        }
      });
      
      // Add explicit instructions to use the image as background
      parts.push({
        text: "CRITICAL INSTRUCTIONS FOR LAYOUT: Use the above image as the BACKGROUND of your flyer design. Do not try to reference it with an img tag - I will handle embedding it for you. Instead, directly create HTML that assumes the image is already the background. Use appropriate text colors that contrast well with the image's colors. Add overlays or semi-transparent elements as needed to maintain text readability over the background image.\n\nMANDATORY STRUCTURE REQUIREMENT: Your HTML must create a layout that uses 100% of the available space from top to bottom. You MUST wrap your entire design in a div with 'h-screen w-full flex flex-col' classes and distribute content throughout the entire height. Add content elements that extend all the way to the bottom of the design. NEVER cluster all content just at the top - distribute it throughout the ENTIRE available height."
      });
    }
    
    // Add logo to the parts if provided
    if (options.logoBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: options.logoBase64
        }
      });
      
      // Add explicit instructions for logo placement
      parts.push({
        text: "IMPORTANT: Use the above image as a LOGO in your flyer design. This is a company or event logo that should be prominently displayed in the design, typically at the top or in a strategic position that complements the overall layout. I will provide you with CSS to properly size and position it."
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
  } catch (error: any) {
    log(`Error generating content with Gemini: ${error}`, "gemini");
    
    // Check for quota limit exceeded error
    const errorMessage = String(error);
    if (errorMessage.includes("429 Too Many Requests") && errorMessage.includes("quota")) {
      throw new Error("API quota limit reached: The Gemini AI API free tier limit has been reached for today. Please try again tomorrow or upgrade to a paid plan.");
    }
    
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
    const backgroundStyle = options.backgroundImageBase64 
      ? `
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          body {
            background-image: url('data:image/jpeg;base64,${options.backgroundImageBase64}');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          /* Ensure content uses full viewport height */
          main, div, section {
            flex: 1;
            min-height: 100%;
            width: 100%;
          }
          /* Force content to fill the entire page */
          .main-content {
            min-height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
          }
        `
      : `
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          body {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          /* Ensure content uses full viewport height */
          main, div, section {
            flex: 1;
            min-height: 100%;
            width: 100%;
          }
          /* Force content to fill the entire page */
          .main-content {
            min-height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
          }
        `;
        
    // Add logo styling if a logo was provided
    const logoStyle = options.logoBase64
      ? `
          /* Logo styling */
          .logo-container {
            display: inline-block;
            position: relative;
          }
          .logo-image {
            max-width: 100%;
            height: auto;
          }
          #company-logo {
            content: url('data:image/jpeg;base64,${options.logoBase64}');
            max-width: 200px;
            max-height: 100px;
            object-fit: contain;
          }
        `
      : '';
        
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
          ${logoStyle}
          
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
          
          /* Ensure no rotated text (enforce horizontal-only text) */
          h1, h2, h3, h4, h5, h6, p, span, div, li, a, strong, em, label, blockquote, caption, button, text {
            transform: none !important;
            rotate: 0deg !important;
            transform-origin: center !important;
          }
          ${cssStyles}
        </style>
      </head>
      <body>
        <div class="main-content w-full h-full flex flex-col">
          ${htmlContent}
        </div>
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
      
      // Set viewport based on aspect ratio if provided
      let viewportWidth = 800;
      let viewportHeight = 1200;
      
      // Apply different size based on aspect ratio
      if (options.aspectRatio) {
        log(`Using aspect ratio: ${options.aspectRatio}`, "gemini");
        
        switch(options.aspectRatio) {
          // Square formats
          case 'original': // Original background image size
            // For original, we use a square format that fits the full background content
            viewportWidth = 1080;
            viewportHeight = 1080;
            break;
          case 'profile': // Instagram Profile (1080×1080)
            viewportWidth = 1080;
            viewportHeight = 1080;
            break;
          case 'post': // Social Media Post (1200×1200)
            viewportWidth = 1200;
            viewportHeight = 1200;
            break;
          case 'square_ad': // Square Ad (250×250)
            viewportWidth = 250;
            viewportHeight = 250;
            break;
            
          // Landscape formats
          case 'fb_cover': // Facebook Cover (820×312)
            viewportWidth = 820;
            viewportHeight = 312;
            break;
          case 'twitter_header': // Twitter Header (1500×500)
            viewportWidth = 1500;
            viewportHeight = 500;
            break;
          case 'yt_thumbnail': // YouTube Thumbnail (1280×720)
            viewportWidth = 1280;
            viewportHeight = 720;
            break;
          case 'linkedin_banner': // LinkedIn Banner (1584×396)
            viewportWidth = 1584;
            viewportHeight = 396;
            break;
          case 'instream': // Video Ad (1920×1080)
            viewportWidth = 1920;
            viewportHeight = 1080;
            break;
            
          // Portrait formats
          case 'stories': // Instagram Stories (1080×1920)
            viewportWidth = 1080;
            viewportHeight = 1920;
            break;
          case 'pinterest': // Pinterest Pin (1000×1500)
            viewportWidth = 1000;
            viewportHeight = 1500;
            break;
            
          // Display Ad formats
          case 'leaderboard': // Leaderboard Ad (728×90)
            viewportWidth = 728;
            viewportHeight = 90;
            break;
          case 'skyscraper': // Skyscraper Ad (160×600)
            viewportWidth = 160;
            viewportHeight = 600;
            break;
            
          default:
            // For unknown aspect ratios, log a warning and use standard dimensions
            log(`Warning: Unknown aspect ratio "${options.aspectRatio}", using default dimensions`, "gemini");
            break;
        }
      }
      
      await page.setViewport({
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: 2,
      });
      
      // Inject CSS to ensure no scrolling or overflow issues
      await page.addStyleTag({
        content: `
          html, body {
            overflow: hidden !important;
            max-height: 100vh !important;
            max-width: 100vw !important;
          }
          
          * {
            max-width: 100vw !important;
          }
          
          /* Ensure elements don't overflow container */
          .main-content {
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important;
            position: relative !important;
          }
        `
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
  } catch (error: any) {
    log(`Error in Gemini flyer generation: ${error}`, "gemini");
    
    // Check for quota limit exceeded error
    const errorMessage = String(error);
    if (errorMessage.includes("429 Too Many Requests") && errorMessage.includes("quota")) {
      throw new Error("API quota limit reached: The Gemini AI API free tier limit has been reached for today. Please try again tomorrow or upgrade to a paid plan.");
    }
    
    throw error;
  }
}