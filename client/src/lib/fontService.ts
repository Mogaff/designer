import { GoogleFont } from './types';

// Google Fonts API key (not required for the webfonts loader)
const GOOGLE_FONTS_API_URL = 'https://www.googleapis.com/webfonts/v1/webfonts';

// Cache for fonts to avoid repeated API calls
let cachedFonts: GoogleFont[] = [];

// Load fonts from predefined list since we don't have a Google Fonts API key
export async function loadGoogleFonts(): Promise<GoogleFont[]> {
  if (cachedFonts.length > 0) {
    return cachedFonts;
  }

  // Use the predefined list of popular fonts
  const fonts = getFallbackFonts();
  cachedFonts = fonts;
  return fonts;
}

// Get fallback fonts list
function getFallbackFonts(): GoogleFont[] {
  // Sans-serif fonts
  const sansSerifFonts: GoogleFont[] = [
    { family: 'Roboto', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Open Sans', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Lato', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Montserrat', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Roboto Condensed', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Source Sans Pro', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Oswald', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Raleway', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Poppins', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Noto Sans', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Ubuntu', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Nunito', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Quicksand', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'PT Sans', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Rubik', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Work Sans', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Inter', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Karla', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Barlow', variants: ['regular', '700'], category: 'sans-serif' },
    { family: 'Mulish', variants: ['regular', '700'], category: 'sans-serif' },
  ];
  
  // Serif fonts
  const serifFonts: GoogleFont[] = [
    { family: 'Roboto Slab', variants: ['regular', '700'], category: 'serif' },
    { family: 'Merriweather', variants: ['regular', '700'], category: 'serif' },
    { family: 'Playfair Display', variants: ['regular', '700'], category: 'serif' },
    { family: 'PT Serif', variants: ['regular', '700'], category: 'serif' },
    { family: 'Lora', variants: ['regular', '700'], category: 'serif' },
    { family: 'Source Serif Pro', variants: ['regular', '700'], category: 'serif' },
    { family: 'Crimson Text', variants: ['regular', '700'], category: 'serif' },
    { family: 'Cormorant Garamond', variants: ['regular', '700'], category: 'serif' },
    { family: 'Libre Baskerville', variants: ['regular', '700'], category: 'serif' },
    { family: 'Noto Serif', variants: ['regular', '700'], category: 'serif' },
  ];
  
  // Display fonts
  const displayFonts: GoogleFont[] = [
    { family: 'Bebas Neue', variants: ['regular'], category: 'display' },
    { family: 'Righteous', variants: ['regular'], category: 'display' },
    { family: 'Rampart One', variants: ['regular'], category: 'display' },
    { family: 'Passion One', variants: ['regular', '700'], category: 'display' },
    { family: 'Alfa Slab One', variants: ['regular'], category: 'display' },
    { family: 'Bangers', variants: ['regular'], category: 'display' },
    { family: 'Racing Sans One', variants: ['regular'], category: 'display' },
    { family: 'Abril Fatface', variants: ['regular'], category: 'display' },
    { family: 'Anton', variants: ['regular'], category: 'display' },
    { family: 'Squada One', variants: ['regular'], category: 'display' },
  ];
  
  // Handwriting fonts
  const handwritingFonts: GoogleFont[] = [
    { family: 'Pacifico', variants: ['regular'], category: 'handwriting' },
    { family: 'Dancing Script', variants: ['regular', '700'], category: 'handwriting' },
    { family: 'Caveat', variants: ['regular', '700'], category: 'handwriting' },
    { family: 'Sacramento', variants: ['regular'], category: 'handwriting' },
    { family: 'Satisfy', variants: ['regular'], category: 'handwriting' },
    { family: 'Kalam', variants: ['regular', '700'], category: 'handwriting' },
    { family: 'Indie Flower', variants: ['regular'], category: 'handwriting' },
    { family: 'Shadows Into Light', variants: ['regular'], category: 'handwriting' },
    { family: 'Comic Neue', variants: ['regular', '700'], category: 'handwriting' },
    { family: 'Amatic SC', variants: ['regular', '700'], category: 'handwriting' },
  ];
  
  // Monospace fonts
  const monospaceFonts: GoogleFont[] = [
    { family: 'Roboto Mono', variants: ['regular', '700'], category: 'monospace' },
    { family: 'Source Code Pro', variants: ['regular', '700'], category: 'monospace' },
    { family: 'IBM Plex Mono', variants: ['regular', '700'], category: 'monospace' },
    { family: 'Space Mono', variants: ['regular', '700'], category: 'monospace' },
    { family: 'Ubuntu Mono', variants: ['regular', '700'], category: 'monospace' },
    { family: 'Fira Mono', variants: ['regular', '700'], category: 'monospace' },
    { family: 'JetBrains Mono', variants: ['regular', '700'], category: 'monospace' },
    { family: 'PT Mono', variants: ['regular'], category: 'monospace' },
    { family: 'Inconsolata', variants: ['regular', '700'], category: 'monospace' },
    { family: 'Anonymous Pro', variants: ['regular', '700'], category: 'monospace' },
  ];
  
  // Combine all categories
  return [
    ...sansSerifFonts,
    ...serifFonts,
    ...displayFonts,
    ...handwritingFonts,
    ...monospaceFonts,
  ];
}

// Load a specific font using the Google Fonts CSS API
export function loadFont(fontFamily: string): void {
  // Replace spaces with + as per Google Fonts URL format
  const formattedFamily = fontFamily.replace(/\s+/g, '+');
  
  // Check if the font is already loaded
  if (document.querySelector(`link[href*="${formattedFamily}"]`)) {
    return;
  }
  
  // Create a link element to load the font
  const linkElement = document.createElement('link');
  linkElement.rel = 'stylesheet';
  linkElement.href = `https://fonts.googleapis.com/css2?family=${formattedFamily}:wght@400;700&display=swap`;
  document.head.appendChild(linkElement);
}

// Preload some common fonts for better performance
export function preloadCommonFonts(): void {
  const commonFonts = [
    'Roboto',
    'Open Sans',
    'Montserrat',
    'Lato',
    'Poppins',
  ];
  
  commonFonts.forEach(font => loadFont(font));
}

// Group fonts by category for better organization
export function groupFontsByCategory(fonts: GoogleFont[]): Record<string, GoogleFont[]> {
  const result: Record<string, GoogleFont[]> = {};
  
  fonts.forEach(font => {
    if (!result[font.category]) {
      result[font.category] = [];
    }
    result[font.category].push(font);
  });
  
  return result;
}

// Apply a font to an element for preview
export function applyFontToElement(element: HTMLElement, fontFamily: string): void {
  loadFont(fontFamily);
  element.style.fontFamily = `"${fontFamily}", sans-serif`;
}