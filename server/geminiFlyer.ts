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
    
    Create an exceptionally creative and professional flyer matching EXACTLY the following prompt from the user:
    "${options.prompt}"
    
    ${options.aspectRatio ? 
      `ABSOLUTE REQUIREMENT: This design MUST be formatted SPECIFICALLY for the "${options.aspectRatio}" aspect ratio.
       Your design must PERFECTLY adhere to this aspect ratio and use the entire available canvas.
       NEVER compress the content into just a portion of the available space.` 
      : ''}
    
    PRECISE LAYOUT INSTRUCTIONS:
    1. You MUST place design elements EXACTLY where specified in the user's prompt
    2. If the prompt says "put X at the top/bottom/corner/side" you MUST follow these instructions precisely
    3. If the prompt says text should appear under a logo, it must be positioned directly underneath it
    4. Text elements should use the FULL WIDTH of their container unless otherwise specified
    5. Content should be distributed according to the user's wishes, not according to conventional design rules
    6. Design elements MUST be positioned according to the prompt instructions, regardless of traditional design principles
    7. If the prompt gives specific positioning instructions (like corners, sides, top, bottom), PRECISELY follow them
    
    ESSENTIAL CREATIVE REQUIREMENTS:
    1. Use Tailwind CSS with creative, non-conventional layouts that fulfill the user's exact specifications
    2. Implement bold, eye-catching typography throughout the ENTIRE design area
    3. Use gradients, overlays, and creative backgrounds that utilize the FULL canvas
    4. Position elements throughout the entire canvas - use ALL areas including corners, edges, and sides
    5. If the prompt mentions specific regions of the canvas (top, bottom, corners), place content EXACTLY there
    6. FILL THE ENTIRE CANVAS from edge to edge - no unused space unless specifically requested
    7. Elements should span the FULL WIDTH of their containers unless specified otherwise
    
    CRITICAL DESIGN RULES:
    1. DO NOT create any buttons or interactive elements - this is a print flyer
    2. DO NOT use rotated, diagonal, or slanted text - ALL text must be perfectly horizontal
    3. You MUST follow ANY placement instructions in the prompt EXACTLY
    4. NEVER constrain text or elements to narrow columns - use the full available width
    5. ALWAYS follow the user's directions about element positioning, regardless of design conventions
    6. FOLLOW the exact aspect ratio provided and design specifically for those dimensions
    7. ALL elements, especially URLs and text under logos, must span the FULL available width
    
    Your final design MUST:
    - Follow the exact layout specifications from the prompt
    - Use the complete canvas from edge to edge
    - Position elements precisely where requested
    - Allow full-width elements to span the entire available space
    - NOT condense elements into narrow columns or limited areas
    
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
        text: "CRITICAL DESIGN INSTRUCTIONS: The provided image will serve as the BACKGROUND for your flyer design. I will handle embedding it for you - do not reference it with an img tag. Create HTML that assumes the image is already the background. Choose text colors that contrast properly with the image, and add overlays/semi-transparent elements as needed for readability.\n\nABSOLUTE POSITIONING REQUIREMENT: You MUST create a layout that uses ABSOLUTE POSITIONING to place elements EXACTLY where the user wants them. Place elements in ALL areas - corners, edges, top, bottom, center - according to the user's prompt. Your design must place text PRECISELY where specified - if text should be at the top left, bottom right, etc., it MUST appear exactly there.\n\nFULL WIDTH MANDATE: ALL text elements (particularly URLs and descriptions) must span the FULL WIDTH of their container. DO NOT create narrow columns or restrict text to a thin area. When placing logos and text, they MUST use the entire width available to them.\n\nPOSITIONING FREEDOM: Use absolute positioning (position: absolute) with specific top/bottom/left/right values to place elements EXACTLY where the user wants them. You have COMPLETE FREEDOM to place elements anywhere on the canvas, not just in conventional sections."
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
        text: "CRITICAL: Use the above image as a LOGO in your flyer design. This is a company or event logo that should be positioned EXACTLY where the user's prompt specifies. If no specific location is given, place it in a strategic position that complements the overall layout.\n\nABSOLUTE POSITIONING: You MUST use absolute positioning to place the logo precisely where specified in the prompt. If the prompt mentions 'place logo at top left' or 'logo in bottom right', you MUST follow these instructions exactly using absolute positioning.\n\nASSOCIATED TEXT: Any text associated with the logo (URLs, website addresses, taglines) should be positioned exactly where specified in the prompt. If no specific position is mentioned, place it directly below the logo and make it use the full available width."
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
            position: relative; /* Support for absolute positioning */
          }
          /* Ensure content uses full viewport height */
          main, div, section {
            min-height: 100%;
            width: 100%;
          }
          /* Force content to fill the entire page */
          .main-content {
            min-height: 100vh;
            width: 100vw;
            position: relative;
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
            position: relative; /* Support for absolute positioning */
          }
          /* Ensure content uses full viewport height */
          main, div, section {
            min-height: 100%;
            width: 100%;
          }
          /* Force content to fill the entire page */
          .main-content {
            min-height: 100vh;
            width: 100vw;
            position: relative;
          }
        `;
        
    // Add logo styling if a logo was provided
    const logoStyle = options.logoBase64
      ? `
          /* Logo styling - positioned absolutely as directed by prompt */
          .logo-container {
            display: block;
            position: absolute; /* Allow placing anywhere on canvas */
          }
          .logo-image {
            max-width: 100%;
            height: auto;
            position: absolute; /* Can be placed anywhere */
          }
          #company-logo {
            content: url('data:image/jpeg;base64,${options.logoBase64}');
            max-width: 200px;
            max-height: 100px;
            object-fit: contain;
            position: absolute; /* Allow creative freedom in placement */
          }
          
          /* Support all Tailwind positioning classes for logos and elements */
          [class*="logo"], img, .logo-container, #company-logo, .logo-image {
            position: absolute !important;
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
        <div class="main-content w-full h-full relative" style="width: 100%; height: 100%; max-width: 100vw; position: relative;">
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
      
      // Inject CSS to ensure no scrolling or overflow issues and support absolute positioning
      await page.addStyleTag({
        content: `
          html, body {
            overflow: hidden !important;
            max-height: 100vh !important;
            max-width: 100vw !important;
            position: relative !important;
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
          
          /* Support for absolute positioning */
          [class*="absolute"], [style*="position: absolute"] {
            position: absolute !important;
          }
          
          /* Support for positioning in different areas of the canvas */
          .top-left, [class*="top-0"][class*="left-0"] {
            top: 0 !important;
            left: 0 !important;
          }
          
          .top-right, [class*="top-0"][class*="right-0"] {
            top: 0 !important;
            right: 0 !important;
          }
          
          .bottom-left, [class*="bottom-0"][class*="left-0"] {
            bottom: 0 !important;
            left: 0 !important;
          }
          
          .bottom-right, [class*="bottom-0"][class*="right-0"] {
            bottom: 0 !important;
            right: 0 !important;
          }
          
          /* Don't restrict positioning - allow elements to be placed anywhere */
          [style*="top:"], [style*="bottom:"], [style*="left:"], [style*="right:"],
          [class*="top-"], [class*="bottom-"], [class*="left-"], [class*="right-"] {
            position: absolute !important;
          }
          
          /* Remove any width constraints on containers */
          .container, section, div, header, footer, main {
            box-sizing: border-box !important;
          }
          
          /* Allow elements with absolute positioning to have any width */
          [style*="position: absolute"], .absolute {
            width: auto !important;
            max-width: 100% !important;
          }
          
          /* Make sure text elements can span full width when needed */
          p, h1, h2, h3, h4, h5, h6, span, a {
            max-width: 100% !important;
          }
          
          /* Override any max-width constraints */
          [class*="max-w-"], [style*="max-width"] {
            max-width: 100% !important;
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