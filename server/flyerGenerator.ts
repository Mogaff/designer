import puppeteer from "puppeteer";
import { exec } from "child_process";
import { promisify } from "util";
import { log } from "./vite";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

type FlyerOptions = {
  imageUrl: string;
  prompt: string;
  headline: string;
  content: string;
  template: string;
};

// Template-specific styling
const templateStyles = {
  default: {
    bgColor: "bg-gradient-to-b from-blue-50 to-blue-100",
    headingColor: "text-slate-900",
    textColor: "text-slate-700",
    imageWrapperClass: "mb-6",
  },
  minimal: {
    bgColor: "bg-white",
    headingColor: "text-slate-900",
    textColor: "text-slate-600",
    imageWrapperClass: "my-6",
  },
  bold: {
    bgColor: "bg-slate-900",
    headingColor: "text-white",
    textColor: "text-slate-300",
    imageWrapperClass: "my-6",
  },
  elegant: {
    bgColor: "bg-gradient-to-br from-slate-50 to-slate-100",
    headingColor: "text-slate-800",
    textColor: "text-slate-600",
    imageWrapperClass: "my-6",
  }
};

// Apply style based on prompt
function applyPromptStyle(prompt: string): string {
  const promptLower = prompt.toLowerCase();
  
  // Very basic styling based on keywords in the prompt
  if (promptLower.includes("vintage") || promptLower.includes("retro")) {
    return `
      filter: sepia(0.4);
      font-family: 'Times New Roman', serif;
    `;
  } else if (promptLower.includes("modern") || promptLower.includes("sleek")) {
    return `
      font-family: 'Inter', sans-serif;
      letter-spacing: 0.05em;
    `;
  } else if (promptLower.includes("bold") || promptLower.includes("strong")) {
    return `
      font-weight: 700;
      letter-spacing: 0.1em;
    `;
  } else if (promptLower.includes("colorful") || promptLower.includes("vibrant")) {
    return `
      background: linear-gradient(45deg, #f06, #9f6);
      color: white;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.3);
    `;
  }
  
  // Default style
  return '';
}

export async function generateFlyer(options: FlyerOptions): Promise<Buffer> {
  log("Starting flyer generation with Puppeteer", "generator");
  
  try {
    // Verify the image exists
    if (!fs.existsSync(options.imageUrl)) {
      log(`Image file not found at path: ${options.imageUrl}`, "generator");
      throw new Error(`Image file not found at path: ${options.imageUrl}`);
    }
    
    // Get absolute path to the image
    const imagePath = path.resolve(options.imageUrl);
    log(`Using image at: ${imagePath}`, "generator");
    
    // Get Chromium executable path
    const { stdout: chromiumPath } = await execAsync("which chromium");
    log(`Found Chromium at: ${chromiumPath.trim()}`, "generator");
    
    // Launch puppeteer with specific settings for Replit environment
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
      
      // Set viewport to A4 size
      // A4 dimensions in pixels at 96 DPI: 794 x 1123
      await page.setViewport({
        width: 794,
        height: 1123,
        deviceScaleFactor: 2,
      });
      
      // Get template-specific styles
      const template = options.template in templateStyles 
        ? options.template 
        : "default";
      const style = templateStyles[template as keyof typeof templateStyles];
      
      // Generate prompts styling
      const promptStyle = applyPromptStyle(options.prompt);
      
      // Base64 encode the image to avoid file path issues
      const imageData = fs.readFileSync(imagePath);
      const base64Image = imageData.toString('base64');
      const mimeType = 'image/jpeg'; // Adjust based on actual image type if needed
      const dataUri = `data:${mimeType};base64,${base64Image}`;
      
      // Create HTML for the flyer
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generated Flyer</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 0;
            width: 794px;
            height: 1123px;
            font-family: 'Inter', sans-serif;
            ${promptStyle}
          }
          .flyer-container {
            width: 100%;
            height: 100%;
            box-sizing: border-box;
            overflow: hidden;
          }
          img {
            max-width: 100%;
            max-height: 50%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <div class="flyer-container ${style.bgColor} p-8 flex flex-col">
          <h1 class="text-4xl font-bold ${style.headingColor} mb-4 text-center">${options.headline}</h1>
          
          <div class="${style.imageWrapperClass} flex justify-center">
            <img src="${dataUri}" alt="Flyer Image" />
          </div>
          
          <div class="text-center ${style.textColor} whitespace-pre-line">
            ${options.content}
          </div>
        </div>
      </body>
      </html>
      `;
      
      await page.setContent(html);
      
      // Wait for image to load
      await page.evaluate(() => {
        return new Promise((resolve) => {
          const images = document.querySelectorAll('img');
          if (images.length === 0) return resolve(true);
          
          let loadedImages = 0;
          images.forEach((img) => {
            if (img.complete) {
              loadedImages++;
              if (loadedImages === images.length) resolve(true);
            } else {
              img.addEventListener('load', () => {
                loadedImages++;
                if (loadedImages === images.length) resolve(true);
              });
              img.addEventListener('error', () => {
                loadedImages++;
                if (loadedImages === images.length) resolve(true);
              });
            }
          });
        });
      });
      
      // Add a small delay to ensure all fonts are loaded
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Take screenshot
      log("Taking screenshot of the flyer", "generator");
      const screenshot = await page.screenshot({
        type: "png",
        fullPage: true,
      });
      
      // Convert Uint8Array to Buffer if needed
      const buffer = Buffer.from(screenshot);
      
      return buffer;
    } finally {
      await browser.close();
      log("Puppeteer browser closed", "generator");
    }
  } catch (error) {
    log(`Error in flyer generation: ${error}`, "generator");
    throw error;
  }
}
