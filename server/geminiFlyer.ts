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
const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });

type GeminiResponse = {
  htmlContent: string;
  cssStyles: string;
};

interface GenerationOptions {
  prompt: string;
  backgroundImageBase64?: string;
  logoBase64?: string;
  aspectRatio?: string;
  forceSimpleTextLayout?: boolean;
}

/**
 * Generate HTML and CSS for a flyer based on a prompt using Gemini AI
 */
export async function generateFlyerContent(options: GenerationOptions): Promise<GeminiResponse> {
  log("Generating flyer content with Gemini AI", "gemini");
  
  try {
    // Create a comprehensive prompt for the AI with enhanced design instructions
    const systemPrompt = `You are an award-winning professional graphic designer who creates stunning, premium visual flyers. Your designs are used by top brands globally because of your exceptional understanding of visual hierarchy, typography, and attractive layouts.
    
    Create a VISUALLY STUNNING, SOPHISTICATED, and PROFESSIONAL flyer for the following prompt:
    "${options.prompt}"
    
    Focus on CREATIVE DESIGN EXCELLENCE with these requirements:
    1. Create a single HTML page with inline CSS that looks like a high-end professional flyer
    2. Use a clean, modern layout with excellent visual hierarchy
    3. Apply sophisticated typography with carefully selected font combinations
    4. Incorporate creative visual elements and styling (gradients, overlays, shapes)
    5. Ensure the design is balanced, harmonious, and delivers high visual impact
    6. Design for a ${options.aspectRatio || "standard"} format
    7. CRITICAL: Position ALL TEXT with absolute position at center of canvas, use percentages (50%) for positioning
    8. CRITICAL: Make sure text is fully contained within the viewport and not cut off or oversized
    9. Use striking typography and dramatic contrast
    10. Ensure all content is visible without scrolling, fits perfectly in the specified dimensions
    
    IMPORTANT OUTPUT FORMAT:
    Respond with ONLY an executable HTML and CSS like a professional graphic designer. Structure your response in JSON format with:
    1. A 'htmlContent' field containing clean, valid HTML
    2. A 'cssStyles' field with any additional CSS styles needed
    
    The design should look like it was created by a professional designer, not generic or template-like.
    If a background image is provided, incorporate it elegantly into the design and extract colors from it.
    
    IMPORTANT TEXT GUIDELINES:
    - For any main headline text, ensure it is centered using 'transform: translate(-50%, -50%)' with 'top: 50%' and 'left: 50%'
    - Set appropriate font sizes that adjust to the container using viewport units (vw, vh)
    - For landscape formats, use smaller font sizes
    - For portrait formats, ensure text doesn't overflow
    - Apply max-width constraints to text elements to prevent overflow
    - Add padding around text to prevent it from touching edges`;

    // Add special design instructions based on the aspect ratio
    let aspectRatioDirections = "";
    if (options.aspectRatio) {
      switch (options.aspectRatio) {
        case 'stories':
          aspectRatioDirections = "This is a vertical Stories format (1080×1920). Design with vertical flow, large typography, and ensure key elements are centered.";
          break;
        case 'post':
          aspectRatioDirections = "This is a square social media post (1200×1200). Create a balanced, centered design with equal emphasis on all sides.";
          break;
        case 'fb_cover':
        case 'twitter_header':
          aspectRatioDirections = "This is a wide header/cover format. Design with horizontal flow, and place key elements in the center or left side.";
          break;
        default:
          aspectRatioDirections = `Design specifically for ${options.aspectRatio} format, optimizing visual elements for this aspect ratio.`;
          break;
      }
    }

    const fullPrompt = `${systemPrompt}
    ${aspectRatioDirections}`;

    // Process background image if provided
    const parts: Part[] = [{ text: fullPrompt }];
    
    // Generate the response from Gemini AI
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.6,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 1000,
      },
    });

    const text = result.response.text();
    log(`Received Gemini response of length: ${text.length}`, "gemini");

    // Parse the JSON from the response
    let responseJson: GeminiResponse;
    try {
      // Extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = text.match(/```(?:json)?(.*?)```/s);
      if (jsonMatch && jsonMatch[1]) {
        responseJson = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try to parse the entire response as JSON
        responseJson = JSON.parse(text);
      }
      
      // Validate the structure
      if (!responseJson.htmlContent || !responseJson.cssStyles) {
        throw new Error("Invalid response structure");
      }
    } catch (error) {
      log(`Failed to parse JSON response: ${error}`, "gemini");
      
      // Fallback: Try to extract HTML and CSS from the text manually
      const htmlMatch = text.match(/<html.*?>([\s\S]*?)<\/html>/i) || 
                        text.match(/<body.*?>([\s\S]*?)<\/body>/i) ||
                        text.match(/(<div.*?>[\s\S]*?<\/div>)/i);
                        
      const cssMatch = text.match(/<style.*?>([\s\S]*?)<\/style>/i) ||
                       text.match(/cssStyles['"]\s*:\s*['"]([^'"]*)['"]/i);
      
      responseJson = {
        htmlContent: htmlMatch ? htmlMatch[0] : `<div class="flyer-content">
          <h1 class="headline">FLYER CONTENT</h1>
          <p>The AI generated content could not be parsed correctly.</p>
        </div>`,
        cssStyles: cssMatch ? cssMatch[1] : `
          .flyer-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 2rem;
            text-align: center;
            color: white;
          }
          .headline {
            font-size: 3rem;
            margin-bottom: 1rem;
          }
        `
      };
    }

    return responseJson;
  } catch (error) {
    log(`Error generating flyer content: ${error}`, "gemini");
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
            background-image: url('data:image/png;base64,${options.backgroundImageBase64}');
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
            content: url('data:image/png;base64,${options.logoBase64}');
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
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          
          /* Ensure headline text is always centered properly */
          .headline, h1, h2, h3, .main-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            margin: 0;
            padding: 0;
            text-align: center;
            width: auto;
            max-width: 90%;
          }
          
          /* Custom styling from Gemini, if any */
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
      
      // Set viewport based on aspect ratio
      let viewportWidth = 1200;
      let viewportHeight = 1200;
      
      // Apply different size based on aspect ratio
      if (options.aspectRatio) {
        log(`Using aspect ratio: ${options.aspectRatio}`, "gemini");
        
        switch(options.aspectRatio) {
          // Square formats
          case 'original': viewportWidth = 1080; viewportHeight = 1080; break;
          case 'profile': viewportWidth = 1080; viewportHeight = 1080; break;
          case 'post': viewportWidth = 1200; viewportHeight = 1200; break;
          case 'square_ad': viewportWidth = 250; viewportHeight = 250; break;
            
          // Landscape formats
          case 'fb_cover': viewportWidth = 820; viewportHeight = 312; break;
          case 'twitter_header': viewportWidth = 1500; viewportHeight = 500; break;
          case 'yt_thumbnail': viewportWidth = 1280; viewportHeight = 720; break;
          case 'linkedin_banner': viewportWidth = 1584; viewportHeight = 396; break;
          case 'instream': viewportWidth = 1920; viewportHeight = 1080; break;
            
          // Portrait formats
          case 'stories': viewportWidth = 1080; viewportHeight = 1920; break;
          case 'pinterest': viewportWidth = 1000; viewportHeight = 1500; break;
            
          // Display Ad formats
          case 'leaderboard': viewportWidth = 728; viewportHeight = 90; break;
          case 'skyscraper': viewportWidth = 160; viewportHeight = 600; break;
          
          default: break;
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
    log(`Error generating flyer: ${error}`, "gemini");
    throw error;
  }
}