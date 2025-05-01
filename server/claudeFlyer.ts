import Anthropic from '@anthropic-ai/sdk';
import { log } from "./vite";
import puppeteer from "puppeteer";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025

const execAsync = promisify(exec);

// Initialize Anthropic with API key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type ClaudeResponse = {
  htmlContent: string;
  cssStyles: string;
};

interface TemplateInfo {
  name: string;
  category: string;
  tags: string;
  description: string;
  glassMorphism: boolean;
  neonEffects: boolean;
}

interface GenerationOptions {
  prompt: string;
  backgroundImageBase64?: string;
  logoBase64?: string;
  aspectRatio?: string;
  templateInfo?: TemplateInfo;
}

/**
 * Generate HTML and CSS for a flyer based on a prompt using Claude AI
 */
export async function generateFlyerContent(options: GenerationOptions): Promise<ClaudeResponse> {
  log("Generating flyer content with Claude AI", "claude");
  
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
    const systemPrompt = `You are Claude, an award-winning, highly skilled graphic design expert specializing in CSS-based designs that overlay images. You create stunning, modern, and engaging visual designs with a professional polish. Use your artistic judgment and advanced techniques to craft beautiful layouts: employ excellent typography, harmonious color schemes, and clear visual hierarchy. Every design should be on-brand and sophisticated, striking the right tone for its target audience. 

    IMPORTANT DESIGN APPROACH:
    - Create a design that overlays CSS content on top of a background image
    - Use CSS positioning, gradients, and effects (not HTML structure) to create a professional design
    - The design should work visually as a flattened single image when captured
    - Focus on typography, color, and spacing that complements the background
    - Add semi-transparent overlays to ensure text readability against any background
    - Use absolute positioning within the flyer-container to place elements precisely
    
    ${options.templateInfo 
      ? `SELECTED TEMPLATE: ${options.templateInfo.name} (${options.templateInfo.category})
       Template description: ${options.templateInfo.description}
       Key features: ${options.templateInfo.tags}
       ${options.templateInfo.glassMorphism ? 'IMPORTANT: Use glass morphism effects with transparency and blur in your design. Create floating panels with backdrop-filter: blur() and background: rgba() for elegant semi-transparent surfaces.' : ''}
       ${options.templateInfo.neonEffects ? 'IMPORTANT: Include neon glowing elements using text-shadow, box-shadow with multiple layers, and bright contrasting colors to create a modern illuminated look.' : ''}
       Design this as a single flattened advertisement image, NOT as a multi-page website or complex HTML structure.`
      : ''}
    
    Create an EXCEPTIONAL, PROFESSIONAL-GRADE FLYER DESIGN using modern CSS techniques based on the following prompt:
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
    
    Return your response in the following JSON format:
    {
      "htmlContent": "the complete HTML code for the flyer",
      "cssStyles": "any custom CSS styles needed to create advanced effects"
    }`;

    // CRITICAL FIX: Use a completely different approach for messaging Claude
    // We create a SINGLE text message with all instructions
    // This avoids any issues with message array structure that might cause problems
    log('[claude] Creating a single consolidated text-only message', 'claude');
    
    // Create additional instructions based on what we have available
    let additionalInstructions = "";
    
    // Add background image instructions if provided
    if (options.backgroundImageBase64) {
      additionalInstructions += `
BACKGROUND IMAGE INSTRUCTIONS:
1. I will automatically apply a background image to your design - do NOT include any image tags
2. Design your flyer to work well with a background image underneath
3. Create semi-transparent colored overlays (using divs with rgba backgrounds) for text readability
4. Use contrasting colors that will be visible against various background colors
`;
    }
    
    // Add logo instructions if provided
    if (options.logoBase64) {
      additionalInstructions += `
LOGO INSTRUCTIONS:
1. Include a prominent space for a LOGO in your design
2. Add a div with class="logo-placeholder" where the logo should appear
3. The logo will be automatically inserted later - do NOT try to include it directly
4. Position the logo in a strategic location that enhances the overall design (typically near the top)
`;
    }
    
    // Combine all text instructions into a single message to avoid any format issues
    const combinedTextPrompt = `${systemPrompt}
    
${additionalInstructions}

IMPORTANT REMINDER:
- Return ONLY valid JSON with htmlContent and cssStyles properties
- Use clean HTML structure with a .flyer-container as the main container
- Include semantic HTML5 with proper structure
- Do not include any <img> tags or try to reference external images`;

    // Log our consolidated prompt for debugging
    log(`[claude] Constructed a consolidated text-only prompt: ${combinedTextPrompt.substring(0, 200)}...`, 'claude');
    
    // Create a simple message structure with a SINGLE text element
    // This is the most reliable way to avoid any format issues with Claude's API
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4096,
      messages: [
        { 
          role: 'user', 
          content: combinedTextPrompt
        }
      ],
      system: "You are an expert CSS designer specializing in creating beautiful flyer designs. Return ONLY valid JSON with htmlContent and cssStyles properties. Use minimal HTML with rich CSS styling."
    });

    // Check if the response has content and the first block is a text block
    if (!message.content || message.content.length === 0) {
      throw new Error("Empty response from Claude");
    }
    
    const firstBlock = message.content[0];
    if (firstBlock.type !== 'text' || !('text' in firstBlock)) {
      throw new Error("Expected text response from Claude but got a different content type");
    }

    const responseText = firstBlock.text;
    
    try {
      // Log raw response for debugging
      log(`Claude raw response: ${responseText.substring(0, 200)}...`, "claude");
      
      // First try parsing the entire response directly
      try {
        const directJson = JSON.parse(responseText);
        log("Successfully parsed direct JSON response", "claude");
        return {
          htmlContent: directJson.htmlContent || "",
          cssStyles: directJson.cssStyles || ""
        };
      } catch (directParseError) {
        log("Direct JSON parse failed, trying to extract JSON", "claude");
      }
      
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        log("Found JSON match in response", "claude");
        const jsonContent = JSON.parse(jsonMatch[0]);
        return {
          htmlContent: jsonContent.htmlContent || "",
          cssStyles: jsonContent.cssStyles || ""
        };
      }
      
      // Fallback: Try to extract HTML content manually
      log("JSON extraction failed, trying to find HTML directly", "claude");
      const htmlMatch = responseText.match(/<html[^>]*>[\s\S]*<\/html>/i);
      if (htmlMatch) {
        log("Found HTML directly in response", "claude");
        return {
          htmlContent: htmlMatch[0],
          cssStyles: ""
        };
      }
      
      // Last resort: if there's a <body> tag, treat the whole response as HTML
      const bodyMatch = responseText.match(/<body[^>]*>[\s\S]*<\/body>/i);
      if (bodyMatch) {
        log("Found body tag, using entire response as HTML", "claude");
        return {
          htmlContent: bodyMatch[0],
          cssStyles: ""
        };
      }
      
      // If we have any HTML tag content, use it
      if (responseText.includes("<div") || responseText.includes("<section")) {
        log("Found HTML tags, using response as HTML fragment", "claude");
        return {
          htmlContent: responseText,
          cssStyles: ""
        };
      }
      
      log("No valid HTML or JSON found in response", "claude");
      throw new Error("Could not extract valid HTML or JSON from the Claude response");
    } catch (parseError) {
      log(`Error parsing Claude response: ${parseError}`, "claude");
      throw parseError;
    }
  } catch (error: any) {
    // Log detailed error information
    log(`Error generating content with Claude: ${error}`, "claude");
    if (error.status) log(`Error status: ${error.status}`, "claude");
    if (error.message) log(`Error message: ${error.message}`, "claude");
    if (error.response) log(`Error response: ${JSON.stringify(error.response)}`, "claude");
    if (error.stack) log(`Error stack: ${error.stack}`, "claude");
    
    // Check for quota limit exceeded error
    const errorMessage = String(error);
    if (errorMessage.includes("429 Too Many Requests") || errorMessage.includes("quota")) {
      throw new Error("API quota limit reached: The Claude AI API free tier limit has been reached for today. Please try again tomorrow or upgrade to a paid plan.");
    }
    
    // Check for authentication errors
    if (errorMessage.includes("401") || errorMessage.includes("auth") || errorMessage.includes("Authentication")) {
      throw new Error("Authentication error with Claude API. Please check your API key.");
    }
    
    throw error;
  }
}

/**
 * Render the Claude-generated flyer content and take a screenshot
 */
export async function renderFlyerFromClaude(options: GenerationOptions): Promise<Buffer> {
  log("Starting Claude-powered flyer generation", "claude");
  
  try {
    // Generate the flyer content using Claude AI
    const { htmlContent, cssStyles } = await generateFlyerContent(options);
    
    // Create a complete HTML document with the generated content
    // Add background image styling if an image was provided
    // Determine the correct media type for background image
    let backgroundMediaType = 'image/jpeg'; // default
    if (options.backgroundImageBase64) {
      if (options.backgroundImageBase64.startsWith('/9j/')) {
        backgroundMediaType = 'image/jpeg';
        log('[claude] Background appears to be JPEG based on base64 start pattern', 'claude');
      } else if (options.backgroundImageBase64.startsWith('iVBOR')) {
        backgroundMediaType = 'image/png';
        log('[claude] Background appears to be PNG based on base64 start pattern', 'claude');
      } else if (options.backgroundImageBase64.startsWith('R0lGOD')) {
        backgroundMediaType = 'image/gif';
        log('[claude] Background appears to be GIF based on base64 start pattern', 'claude');
      } else if (options.backgroundImageBase64.startsWith('UklGR')) {
        backgroundMediaType = 'image/webp';
        log('[claude] Background appears to be WebP based on base64 start pattern', 'claude');
      } else {
        log('[claude] Could not detect background format from base64, using JPEG as default', 'claude');
      }
    }
    
    const backgroundStyle = options.backgroundImageBase64 
      ? `
          body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #000;
          }
          .flyer-container {
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: center;
            background-image: url('data:${backgroundMediaType};base64,${options.backgroundImageBase64}');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          }
          .flyer-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.3));
            pointer-events: none;
            z-index: 1;
          }
          .flyer-container > * {
            position: relative;
            z-index: 2;
          }
        `
      : `
          body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #f5f5f5;
          }
          .flyer-container {
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: center;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          }
        `;
        
    // Add logo styling if a logo was provided
    let logoStyle = '';
    
    if (options.logoBase64) {
      // Try to detect the image type from data URL if present in the brand kit
      let logoDataType = 'image/png'; // Default type
      
      if (options.logoBase64.startsWith('/9j/')) {
        logoDataType = 'image/jpeg';
        log('[claude] Logo appears to be JPEG based on base64 start pattern', 'claude');
      } else if (options.logoBase64.startsWith('iVBOR')) {
        logoDataType = 'image/png';
        log('[claude] Logo appears to be PNG based on base64 start pattern', 'claude');
      } else if (options.logoBase64.startsWith('R0lGOD')) {
        logoDataType = 'image/gif';
        log('[claude] Logo appears to be GIF based on base64 start pattern', 'claude');
      } else if (options.logoBase64.startsWith('UklGR')) {
        logoDataType = 'image/webp';
        log('[claude] Logo appears to be WebP based on base64 start pattern', 'claude');
      } else {
        log('[claude] Could not detect logo format from base64 pattern, using PNG as default', 'claude');
      }
      
      log(`[claude] Using ${logoDataType} for logo in HTML`, 'claude');
      
      logoStyle = `
        /* Logo styling */
        .logo-container {
          display: inline-block;
          position: relative;
        }
        .logo-image {
          max-width: 100%;
          height: auto;
        }
        .logo-placeholder {
          height: 100px;
          width: 200px;
          background-color: rgba(200, 200, 200, 0.2);
          display: flex;
          justify-content: center;
          align-items: center;
          border: 2px dashed rgba(255, 255, 255, 0.3);
          margin: 1rem auto;
          border-radius: 8px;
        }
        #company-logo {
          max-width: 200px;
          max-height: 100px;
          object-fit: contain;
        }
      `;
    }
        
    // Process HTML content to insert the actual logo if we have logoBase64
    let processedHtmlContent = htmlContent;
    
    if (options.logoBase64) {
      // Try to find a placeholder for the logo (Claude was instructed to create one)
      const logoPlaceholderRegex = /<div[^>]*class="[^"]*logo[^"]*"[^>]*>.*?<\/div>/i;
      const logoContainerRegex = /<div[^>]*class="[^"]*logo-container[^"]*"[^>]*>.*?<\/div>/i;
      const logoImgRegex = /<img[^>]*id="(company-logo|logo)"[^>]*>/i;
      
      // Determine the correct image URL format with detected type
      let logoDataType = 'image/png'; // Default type
      
      if (options.logoBase64.startsWith('/9j/')) {
        logoDataType = 'image/jpeg';
      } else if (options.logoBase64.startsWith('iVBOR')) {
        logoDataType = 'image/png';
      } else if (options.logoBase64.startsWith('R0lGOD')) {
        logoDataType = 'image/gif';
      } else if (options.logoBase64.startsWith('UklGR')) {
        logoDataType = 'image/webp';
      }
      
      const logoImgHtml = `<img id="company-logo" src="data:${logoDataType};base64,${options.logoBase64}" alt="Company Logo" class="logo-image" style="max-width: 200px; max-height: 100px; object-fit: contain;">`;
      
      // Try to replace logo placeholders in different ways
      if (processedHtmlContent.match(logoPlaceholderRegex)) {
        processedHtmlContent = processedHtmlContent.replace(logoPlaceholderRegex, `<div class="logo-container">${logoImgHtml}</div>`);
        log('[claude] Replaced logo placeholder with actual logo', 'claude');
      } else if (processedHtmlContent.match(logoContainerRegex)) {
        processedHtmlContent = processedHtmlContent.replace(logoContainerRegex, `<div class="logo-container">${logoImgHtml}</div>`);
        log('[claude] Replaced logo container with actual logo', 'claude');
      } else if (processedHtmlContent.match(logoImgRegex)) {
        processedHtmlContent = processedHtmlContent.replace(logoImgRegex, logoImgHtml);
        log('[claude] Replaced logo img with actual logo', 'claude');
      } else {
        // If no placeholder found, try to insert logo at the top of the content
        log('[claude] No logo placeholder found, trying to insert at top of content', 'claude');
        
        // Look for a header or the first div in the content
        const headerRegex = /<header[^>]*>|<div[^>]*class="[^"]*header[^"]*"[^>]*>/i;
        const firstDivRegex = /<div[^>]*>/i;
        
        if (processedHtmlContent.match(headerRegex)) {
          const headerMatch = headerRegex.exec(processedHtmlContent);
          if (headerMatch) {
            const insertPos = headerMatch.index + headerMatch[0].length;
            processedHtmlContent = processedHtmlContent.slice(0, insertPos) + 
              `<div class="logo-container" style="margin: 1rem auto; text-align: center;">${logoImgHtml}</div>` + 
              processedHtmlContent.slice(insertPos);
            log('[claude] Inserted logo after header', 'claude');
          }
        } else if (processedHtmlContent.match(firstDivRegex)) {
          const divMatch = firstDivRegex.exec(processedHtmlContent);
          if (divMatch) {
            const insertPos = divMatch.index + divMatch[0].length;
            processedHtmlContent = processedHtmlContent.slice(0, insertPos) + 
              `<div class="logo-container" style="margin: 1rem auto; text-align: center;">${logoImgHtml}</div>` + 
              processedHtmlContent.slice(insertPos);
            log('[claude] Inserted logo after first div', 'claude');
          }
        }
      }
    }
    
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Claude Generated Flyer</title>
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
        ${processedHtmlContent}
      </body>
      </html>
    `;
    
    // Save the HTML to a temporary file
    const tempDir = path.resolve(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const htmlPath = path.join(tempDir, `claude-flyer-${Date.now()}.html`);
    fs.writeFileSync(htmlPath, fullHtml);
    log(`Saved generated HTML to: ${htmlPath}`, "claude");
    
    // Get Chromium executable path
    const { stdout: chromiumPath } = await execAsync("which chromium");
    log(`Found Chromium at: ${chromiumPath.trim()}`, "claude");
    
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
        // Log the aspect ratio and ensure it's a valid string
        const aspectRatio = String(options.aspectRatio).toLowerCase().trim();
        log(`Using aspect ratio: ${aspectRatio}`, "claude");
        
        // IMPORTANT FIX: Handle both snake_case and kebab-case versions of aspect ratio
        // Correct string matching to properly identify aspect ratios coming from client
        switch(aspectRatio) {
          // Square formats
          case 'profile':
          case 'square': 
          case 'square_ad':
          case 'square-ad':
            viewportWidth = 1080;
            viewportHeight = 1080;
            break;
          case 'post':
          case 'social_post':
          case 'social-post':
            viewportWidth = 1200;
            viewportHeight = 1200;
            break;
            
          // Landscape formats
          case 'fb_cover':
          case 'fb-cover':
          case 'facebook_cover':
          case 'facebook-cover':
            viewportWidth = 820;
            viewportHeight = 312;
            break;
          case 'twitter_header':
          case 'twitter-header':
            viewportWidth = 1500;
            viewportHeight = 500;
            break;
          case 'yt_thumbnail':
          case 'yt-thumbnail':
          case 'youtube_thumbnail':
          case 'youtube-thumbnail':
          case '16:9':
          case '16-9':
            viewportWidth = 1280;
            viewportHeight = 720;
            break;
          case 'linkedin_banner':
          case 'linkedin-banner':
            viewportWidth = 1584;
            viewportHeight = 396;
            break;
          case 'instream':
          case 'landscape':
          case 'widescreen':
            viewportWidth = 1920;
            viewportHeight = 1080;
            break;
            
          // Portrait formats
          case 'stories':
          case 'instagram_stories':
          case 'instagram-stories':
          case 'portrait':
            viewportWidth = 1080;
            viewportHeight = 1920;
            break;
          case 'pinterest':
          case 'pinterest_pin':
          case 'pinterest-pin':
            viewportWidth = 1000;
            viewportHeight = 1500;
            break;
            
          // Display Ad formats
          case 'leaderboard':
          case 'leaderboard_ad':
          case 'leaderboard-ad':
            viewportWidth = 728;
            viewportHeight = 90;
            break;
          case 'skyscraper':
          case 'skyscraper_ad':
          case 'skyscraper-ad':
            viewportWidth = 160;
            viewportHeight = 600;
            break;
            
          default:
            // If no valid aspect ratio is matched, assume square format
            log(`No matching aspect ratio found for '${aspectRatio}', defaulting to square`, "claude");
            viewportWidth = 1024;
            viewportHeight = 1024;
            break;
        }
      }
      
      await page.setViewport({
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: 2,
      });
      
      // Load the HTML file - using 'load' instead of 'networkidle0' for faster generation
      await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });
      
      // Take screenshot
      log("Taking screenshot of the Claude-generated flyer", "claude");
      
      // Wait a bit longer for all content and styles to load properly
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try multiple container selectors that Claude might generate
      const selectors = [
        '.flyer-container', 
        '.main-container', 
        '.vv-logo-container',
        '.v-container',
        '.haitugen-container',
        '.design-container',
        '.container',
        '.content-wrapper',
        'main',
        'body > div'
      ];
      
      // Try each selector
      for (const selector of selectors) {
        const elementHandle = await page.$(selector);
        if (elementHandle) {
          log(`Found container with selector: ${selector}`, "claude");
          try {
            // Get bounding box for the element
            const boundingBox = await elementHandle.boundingBox();
            if (boundingBox && boundingBox.width > 50 && boundingBox.height > 50) {
              // Take screenshot with high quality
              const screenshot = await elementHandle.screenshot({
                type: 'jpeg', 
                quality: 95,
                omitBackground: false
              });
              
              // CRITICAL FIX: Ensure the buffer is properly converted to a format
              // that can be correctly base64 encoded later
              // This avoids the numeric buffer values issue
              const properBuffer = Buffer.from(screenshot);
              return properBuffer;
            }
          } catch (err) {
            log(`Error taking screenshot of element with selector ${selector}: ${err}`, "claude");
          }
        }
      }
      
      // If no suitable container is found, take a screenshot of the entire page
      log("No suitable container found, taking screenshot of entire page", "claude");
      try {
        // Make sure content is centered nicely
        await page.addStyleTag({
          content: `
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 0;
              overflow: hidden;
              background: #000;
            }
          `
        });
        
        // Take a slight timeout to ensure styles are applied
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const screenshot = await page.screenshot({
          type: 'jpeg',
          quality: 95,
          fullPage: false
        });
        
        // Same fix for full page screenshot
        const properBuffer = Buffer.from(screenshot);
        return properBuffer;
      } catch (err) {
        log(`Error taking screenshot of page: ${err}`, "claude");
        throw err;
      }
    } finally {
      await browser.close();
      
      // Clean up the temp HTML file
      try {
        fs.unlinkSync(htmlPath);
        log(`Cleaned up temporary HTML file: ${htmlPath}`, "claude");
      } catch (err) {
        log(`Error cleaning up temporary HTML file: ${err}`, "claude");
      }
    }
    
  } catch (error) {
    log(`Error rendering flyer from Claude: ${error}`, "claude");
    
    // Add detailed error info for debugging
    if (error instanceof Error) {
      log(`Error details: ${error.message}`, "claude");
      if (error.stack) {
        log(`Error stack: ${error.stack}`, "claude");
      }
    }
    
    // Try to create a basic error image as fallback
    try {
      log("Attempting to create error image fallback", "claude");
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox", 
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage"
        ],
      });
      
      const page = await browser.newPage();
      await page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #f8f9fa;
            }
            .error-container {
              text-align: center;
              padding: 2rem;
              border-radius: 8px;
              background: white;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              max-width: 80%;
            }
            h1 {
              color: #dc2626;
              margin-bottom: 1rem;
            }
            p {
              color: #374151;
              margin-bottom: 1.5rem;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>Design Generation Error</h1>
            <p>We encountered a problem generating your design. Please try again with a different prompt or options.</p>
          </div>
        </body>
        </html>
      `);
      
      const screenshot = await page.screenshot({ type: 'jpeg', quality: 90 });
      await browser.close();
      
      // Also fix the error fallback image
      const properBuffer = Buffer.from(screenshot);
      return properBuffer;
    } catch (fallbackError) {
      log(`Error creating fallback image: ${fallbackError}`, "claude");
      // If even the fallback fails, rethrow the original error
      throw error;
    }
  }
}