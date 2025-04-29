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
    // Get sizing info for the prompt based on aspect ratio
    let aspectRatioInfo = "";
    if (options.aspectRatio) {
      switch(options.aspectRatio) {
        // Square formats
        case 'profile': // Instagram Profile (1080×1080)
          aspectRatioInfo = "SQUARE (1:1) format for Instagram Profile (1080×1080 pixels)";
          break;
        case 'post': // Social Media Post (1200×1200)
          aspectRatioInfo = "SQUARE (1:1) format for Social Media Posts (1200×1200 pixels)";
          break;
        // Landscape formats
        case 'fb_cover': // Facebook Cover (820×312)
          aspectRatioInfo = "WIDE RECTANGULAR format for Facebook Cover (820×312 pixels)";
          break;
        case 'twitter_header': // Twitter Header (1500×500)
          aspectRatioInfo = "WIDE RECTANGULAR format for Twitter Header (1500×500 pixels)";
          break;
        case 'yt_thumbnail': // YouTube Thumbnail (1280×720)
          aspectRatioInfo = "LANDSCAPE format for YouTube Thumbnail (1280×720 pixels, 16:9 ratio)";
          break;
        case 'linkedin_banner': // LinkedIn Banner (1584×396)
          aspectRatioInfo = "VERY WIDE format for LinkedIn Banner (1584×396 pixels, 4:1 ratio)";
          break;
        case 'instream': // Video Ad (1920×1080)
          aspectRatioInfo = "LANDSCAPE format for Video Ads (1920×1080 pixels, 16:9 ratio)";
          break;
        // Portrait formats
        case 'stories': // Instagram Stories (1080×1920)
          aspectRatioInfo = "VERTICAL format for Instagram Stories (1080×1920 pixels, 9:16 ratio)";
          break;
        case 'pinterest': // Pinterest Pin (1000×1500)
          aspectRatioInfo = "VERTICAL format for Pinterest Pins (1000×1500 pixels, 2:3 ratio)";
          break;
        default:
          aspectRatioInfo = `Format "${options.aspectRatio}" with appropriate dimensions`;
      }
    }

    // Create a comprehensive prompt for the AI with enhanced design instructions
    const systemPrompt = `You are an award-winning professional GRAPHIC DESIGNER creating high-end visual designs for luxury brands and advertising agencies. You have won multiple design awards for your innovative, eye-catching designs. You specialize in creating VISUALLY STUNNING PRINT-QUALITY DESIGNS with sophisticated typography, masterful composition, and artful use of color.
    
    Create an EXCEPTIONAL, PROFESSIONAL-GRADE GRAPHIC DESIGN using Tailwind CSS and advanced design techniques based on the following prompt:
    "${options.prompt}"
    
    ${options.aspectRatio ? 
      `EXTREMELY IMPORTANT: This design is for the ${aspectRatioInfo}. 
       Your design MUST precisely fit this exact aspect ratio without any overflow or extra space.
       YOU MUST create your design inside a parent container with fixed dimensions matching exactly this aspect ratio.
       Always wrap your design in a parent div like this:
       <div class="flyer-container" style="width: [WIDTH]px; height: [HEIGHT]px; overflow: hidden;">
         <!-- Your design goes here -->
       </div>
       Replace [WIDTH] and [HEIGHT] with the exact pixel dimensions specified for this format.` 
      : ''}
    
    DESIGN PHILOSOPHY & APPROACH:
    1. Think like a professional PRINT DESIGNER, not a web developer - focus on visual impact, not web functionality
    2. Create designs that would be suitable for a high-end advertising campaign or luxury brand
    3. Draw inspiration from award-winning graphic design work by top agencies like Pentagram, Sagmeister & Walsh, and Wolff Olins
    4. Your design should look like it belongs in a prestigious design annual or creative industry award showcase
    
    Your design MUST include:
    1. SOPHISTICATED VISUAL HIERARCHY with thoughtful organization of elements
    2. PROFESSIONAL TYPOGRAPHY using elegant typeface combinations that create dramatic contrast
    3. ARTFUL COLOR PALETTES with harmonious, intentional color relationships - avoid default or basic color schemes
    4. ADVANCED COMPOSITION techniques with golden ratio proportions and masterful use of white space
    5. PREMIUM VISUAL TREATMENT with depth, texture, and visual richness (overlays, gradients, textures, masks)
    6. CREATIVE GRAPHIC ELEMENTS like custom shapes, elegant dividers, and sophisticated patterns
    7. ARTISTIC TOUCHES that demonstrate attention to detail (subtle textures, refined borders, elegant shadows)
    8. LUXURY BRAND AESTHETICS that convey premium, upscale quality
    
    CRITICAL DESIGN REQUIREMENTS:
    1. DO NOT create any buttons or interactive elements - this is a PRINT DESIGN, not a website
    2. DO NOT use rotated, diagonal, or slanted text - ALL text must be perfectly horizontal
    3. Keep all headings and text content perfectly straight (0 degree rotation)
    4. Use only straight text alignment (no diagonal text)
    5. Text can be left-aligned, right-aligned or centered, but never at an angle
    6. Ensure ALL content fits within the specified container - nothing should overflow or be cut off
    7. The design must respect the aspect ratio exactly - no extra space or padding outside the main container
    
    NEVER CREATE:
    - Buttons, clickable elements, or any web-only interactive components
    - Rotated, angled, or diagonal text of any kind
    - Basic or generic web layouts (navigation bars, footers, etc.)
    - Simple, uninspired grid layouts with equal-sized sections
    - Default or flat color schemes without visual interest
    - Designs that lack professional polish or refinement
    - Layouts that look like website templates or basic web designs
    
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
        text: "IMPORTANT: Use the above image as the BACKGROUND of your flyer design. Do not try to reference it with an img tag - I will handle embedding it for you. Instead, directly create HTML that assumes the image is already the background. Use appropriate text colors that contrast well with the image's colors. Add overlays or semi-transparent elements as needed to maintain text readability over the background image."
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
          body {
            margin: 0;
            padding: 0;
            background-image: url('data:image/jpeg;base64,${options.backgroundImageBase64}');
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
      
      // Set viewport based on aspect ratio if provided
      let viewportWidth = 800;
      let viewportHeight = 1200;
      
      // Apply different size based on aspect ratio
      if (options.aspectRatio) {
        log(`Using aspect ratio: ${options.aspectRatio}`, "gemini");
        
        switch(options.aspectRatio) {
          // Square formats
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
            // Default dimensions for other or unknown aspect ratios
            break;
        }
      }
      
      await page.setViewport({
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: 2,
      });
      
      // Load the HTML file
      await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
      
      // Take screenshot
      log("Taking screenshot of the Gemini-generated flyer", "gemini");
      
      // First try to find the flyer-container element
      const elementHandle = await page.$('.flyer-container');
      
      if (elementHandle) {
        // If we can find the container, take a screenshot of just that element
        log("Found flyer-container element, taking targeted screenshot", "gemini");
        const screenshot = await elementHandle.screenshot({
          type: "png",
          omitBackground: false
        });
        return Buffer.from(screenshot);
      } else {
        // Fallback to a standard screenshot with the configured viewport
        log("No flyer-container found, taking viewport screenshot", "gemini");
        const screenshot = await page.screenshot({
          type: "png",
          fullPage: false
        });
        return Buffer.from(screenshot);
      }
      
      // Clean up the temporary HTML file before returning
      fs.unlinkSync(htmlPath);
      
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