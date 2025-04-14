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
    // Create a specific template and prompt for the AI to fill in with content
    const systemPrompt = `You are going to fill in a professional flyer template with content from a user prompt.

The following is the user's prompt that describes what they want in the flyer:
"${options.prompt}"

I've already created a professional-looking flyer template with the proper HTML structure and CSS. 
YOUR ONLY JOB is to replace the placeholder content with relevant content from the user's prompt.

DO NOT CHANGE the HTML structure or CSS styling - only replace the text content in the designated areas.

Here are the sections you need to fill with SPECIFIC CONTENT from the user's prompt:
1. MAIN_HEADLINE - Create a bold, attention-grabbing headline (5-8 words maximum)
2. SUBHEADING - Create a short, supportive subheading (10-15 words maximum)
3. BODY_TEXT - The main descriptive text from the prompt (30-50 words)
4. CALL_TO_ACTION - A compelling call to action (5-10 words)
5. HIGHLIGHT_1, HIGHLIGHT_2, HIGHLIGHT_3 - Three key benefits or features (3-5 words each)

Your response should contain ONLY the JSON with these replacements. DO NOT add any explanations.
Use exactly this format:

{
  "htmlContent": "<div class='flyer-content'>...(the complete HTML with your replacements)...</div>",
  "cssStyles": ""
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
    }
    
    // Add logo to the parts if provided
    if (options.logoBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: options.logoBase64
        }
      });
    }

    // Add the specific flyer template that Gemini will fill in
    parts.push({
      text: `
Here is the template you should fill with content. ONLY REPLACE the placeholder text (MAIN_HEADLINE, SUBHEADING, etc.) with appropriate content from the user prompt. DO NOT CHANGE anything else:

<div class="flyer-content">
  <!-- Overlay for better text contrast -->
  <div class="overlay"></div>
  
  <!-- Decorative elements -->
  <div class="shape circle shape-1"></div>
  <div class="shape circle shape-2"></div>
  <div class="shape rectangle shape-3"></div>
  <div class="shape rectangle shape-4"></div>
  
  <!-- Main content area -->
  <div class="text-container main-content">
    <h1 class="headline">MAIN_HEADLINE</h1>
    <h2 class="subheading">SUBHEADING</h2>
    <p class="body-text">BODY_TEXT</p>
    <div class="cta-button">CALL_TO_ACTION</div>
  </div>
  
  <!-- Highlight boxes -->
  <div class="highlights-container">
    <div class="highlight-box">
      <div class="highlight-icon">•</div>
      <div class="highlight-text">HIGHLIGHT_1</div>
    </div>
    <div class="highlight-box">
      <div class="highlight-icon">•</div>
      <div class="highlight-text">HIGHLIGHT_2</div>
    </div>
    <div class="highlight-box">
      <div class="highlight-icon">•</div>
      <div class="highlight-text">HIGHLIGHT_3</div>
    </div>
  </div>
</div>
`
    });

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
    const htmlMatch = text.match(/<div class="flyer-content">[\s\S]*<\/div>/i);
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Montserrat:wght@100..900&family=Raleway:wght@100..900&family=Poppins:wght@100..900&display=swap" rel="stylesheet">
        <script>
          tailwind.config = {
            theme: {
              extend: {
                animation: {
                  'gradient': 'gradient 8s ease infinite',
                  'float': 'float 6s ease-in-out infinite',
                  'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                  'slide-in': 'slideIn 1s ease-out forwards',
                  'fade-in': 'fadeIn 1.2s ease-out forwards',
                  'scale-in': 'scaleIn 0.8s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards',
                },
                keyframes: {
                  gradient: {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                  },
                  float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                  },
                  slideIn: {
                    '0%': { transform: 'translateX(-100%)', opacity: 0 },
                    '100%': { transform: 'translateX(0)', opacity: 1 },
                  },
                  fadeIn: {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 },
                  },
                  scaleIn: {
                    '0%': { transform: 'scale(0.8)', opacity: 0 },
                    '100%': { transform: 'scale(1)', opacity: 1 },
                  }
                },
                fontFamily: {
                  'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
                  'montserrat': ['Montserrat', 'ui-sans-serif', 'system-ui'],
                  'raleway': ['Raleway', 'ui-sans-serif', 'system-ui'],
                  'poppins': ['Poppins', 'ui-sans-serif', 'system-ui']
                }
              }
            }
          }
        </script>
        <style>
          ${backgroundStyle}
          ${logoStyle}
          
          /* Reset to ensure flyer fills entire canvas */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            position: relative;
            font-family: 'Montserrat', sans-serif;
          }
          
          /* Force all content to fill entire available space */
          .flyer-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          
          /* Main flyer styling */
          .flyer-content {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            font-family: 'Montserrat', sans-serif;
          }
          
          /* Overlay for text contrast */
          .overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.7) 100%);
            z-index: 1;
          }
          
          /* Decorative shapes */
          .shape {
            position: absolute;
            z-index: 2;
          }
          
          .shape-1 {
            width: 200px;
            height: 200px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            top: -100px;
            right: -50px;
            backdrop-filter: blur(5px);
          }
          
          .shape-2 {
            width: 150px;
            height: 150px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 50%;
            bottom: -50px;
            left: -50px;
            backdrop-filter: blur(8px);
          }
          
          .shape-3 {
            width: 300px;
            height: 10px;
            background: rgba(255, 255, 255, 0.2);
            top: 30%;
            right: -50px;
            transform: rotate(-45deg);
          }
          
          .shape-4 {
            width: 400px;
            height: 8px;
            background: rgba(255, 255, 255, 0.15);
            bottom: 25%;
            left: -100px;
            transform: rotate(30deg);
          }
          
          /* Main content area */
          .main-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            z-index: 5;
            text-align: center;
            color: white;
          }
          
          .headline {
            font-size: 4rem;
            font-weight: 800;
            margin-bottom: 1rem;
            line-height: 1.1;
            background: linear-gradient(45deg, #ffffff, #b8b8b8);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 2px 10px rgba(0,0,0,0.3);
          }
          
          .subheading {
            font-size: 1.8rem;
            font-weight: 600;
            margin-bottom: 2rem;
            color: #e0e0e0;
          }
          
          .body-text {
            font-size: 1.2rem;
            line-height: 1.6;
            margin-bottom: 2.5rem;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
            color: #f0f0f0;
          }
          
          /* Call to action button */
          .cta-button {
            display: inline-block;
            background: linear-gradient(45deg, #4a6cf7, #0ea5e9);
            color: white;
            font-weight: 700;
            padding: 1rem 2.5rem;
            border-radius: 50px;
            font-size: 1.25rem;
            text-transform: uppercase;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            margin-bottom: 3rem;
          }
          
          /* Highlight boxes */
          .highlights-container {
            position: absolute;
            display: flex;
            justify-content: center;
            gap: 2rem;
            bottom: 8%;
            left: 0;
            width: 100%;
            z-index: 5;
          }
          
          .highlight-box {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 1rem 1.5rem;
            border-radius: 8px;
            border-left: 3px solid #4a6cf7;
          }
          
          .highlight-icon {
            font-size: 1.8rem;
            color: #4a6cf7;
            margin-right: 0.75rem;
          }
          
          .highlight-text {
            font-size: 1rem;
            font-weight: 600;
            color: white;
          }
          
          /* Responsive adjustments */
          @media (max-width: 768px) {
            .headline {
              font-size: 3rem;
            }
            
            .subheading {
              font-size: 1.4rem;
            }
            
            .body-text {
              font-size: 1rem;
            }
            
            .highlights-container {
              flex-direction: column;
              align-items: center;
              gap: 1rem;
              bottom: 5%;
            }
          }
          
          /* Ensure no rotated text */
          h1, h2, h3, h4, h5, h6, p, span, div, li, a, strong, em, label, blockquote, caption, button, text {
            transform: none !important;
            rotate: 0deg !important;
            transform-origin: center !important;
          }
          
          /* Custom styling from Gemini, if any */
          ${cssStyles}
        </style>
      </head>
      <body>
        <div class="flyer-container" style="position: absolute; inset: 0; width: 100%; height: 100%;">
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