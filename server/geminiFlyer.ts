import { GoogleGenerativeAI } from "@google/generative-ai";
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

/**
 * Generate HTML and CSS for a flyer based on a prompt using Gemini AI
 */
export async function generateFlyerContent(prompt: string): Promise<GeminiResponse> {
  log("Generating flyer content with Gemini AI", "gemini");
  
  try {
    // Create a comprehensive prompt for the AI
    const systemPrompt = `You are an expert web designer specialized in creating beautiful flyers using Tailwind CSS.
    
    Create the HTML and CSS for a visually appealing flyer based on the following prompt:
    "${prompt}"
    
    The HTML should:
    1. Use Tailwind CSS classes for styling
    2. Be responsive and visually appealing
    3. Include placeholder text that's relevant to the prompt if specific content isn't mentioned
    4. Have a clean, modern design
    5. Be fully self-contained in a single HTML file with inline CSS
    
    Return your response in the following JSON format:
    {
      "htmlContent": "the complete HTML code for the flyer",
      "cssStyles": "any additional custom CSS styles needed (if any)"
    }`;

    // Generate content using Gemini
    const result = await model.generateContent(systemPrompt);
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
export async function renderFlyerFromGemini(prompt: string): Promise<Buffer> {
  log("Starting Gemini-powered flyer generation", "gemini");
  
  try {
    // Generate the flyer content using Gemini AI
    const { htmlContent, cssStyles } = await generateFlyerContent(prompt);
    
    // Create a complete HTML document with the generated content
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gemini Generated Flyer</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
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