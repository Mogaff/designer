import { GoogleFont } from './types';

// Default popular Google Fonts to use when no API key is available
const DEFAULT_FONTS: GoogleFont[] = [
  {
    family: 'Roboto',
    variants: ['regular', '500', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Open Sans',
    variants: ['regular', '600', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Lato',
    variants: ['regular', '700', '900'],
    category: 'sans-serif'
  },
  {
    family: 'Montserrat',
    variants: ['regular', '500', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Roboto Condensed',
    variants: ['regular', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Source Sans Pro',
    variants: ['regular', '600', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Oswald',
    variants: ['regular', '500', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Roboto Mono',
    variants: ['regular', '500', '700'],
    category: 'monospace'
  },
  {
    family: 'Raleway',
    variants: ['regular', '500', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Merriweather',
    variants: ['regular', '700', '900'],
    category: 'serif'
  },
  {
    family: 'Ubuntu',
    variants: ['regular', '500', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Playfair Display',
    variants: ['regular', '700', '900'],
    category: 'serif'
  },
  {
    family: 'Poppins',
    variants: ['regular', '500', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Nunito',
    variants: ['regular', '600', '700', '800'],
    category: 'sans-serif'
  },
  {
    family: 'Lora',
    variants: ['regular', '700'],
    category: 'serif'
  },
  {
    family: 'Work Sans',
    variants: ['regular', '500', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Fira Sans',
    variants: ['regular', '500', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Noto Sans',
    variants: ['regular', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Quicksand',
    variants: ['regular', '500', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Noto Serif',
    variants: ['regular', '700'],
    category: 'serif'
  },
  {
    family: 'Rubik',
    variants: ['regular', '500', '700'],
    category: 'sans-serif'
  },
  {
    family: 'PT Sans',
    variants: ['regular', '700'],
    category: 'sans-serif'
  },
  {
    family: 'PT Serif',
    variants: ['regular', '700'],
    category: 'serif'
  },
  {
    family: 'Arimo',
    variants: ['regular', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Noto Sans JP',
    variants: ['regular', '500', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Barlow',
    variants: ['regular', '500', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Mulish',
    variants: ['regular', '600', '700', '800'],
    category: 'sans-serif'
  },
  {
    family: 'Indie Flower',
    variants: ['regular'],
    category: 'handwriting'
  },
  {
    family: 'Inconsolata',
    variants: ['regular', '700'],
    category: 'monospace'
  },
  {
    family: 'Dancing Script',
    variants: ['regular', '700'],
    category: 'handwriting'
  },
  {
    family: 'Pacifico',
    variants: ['regular'],
    category: 'handwriting'
  },
  {
    family: 'Caveat',
    variants: ['regular', '700'],
    category: 'handwriting'
  }
];

/**
 * Loads fonts from Google Fonts API
 */
export async function fetchGoogleFonts(): Promise<GoogleFont[]> {
  try {
    // When implementing with a real API key:
    // const response = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`);
    // const data = await response.json();
    // return data.items;
    
    // For now, return our default font list
    return DEFAULT_FONTS;
  } catch (error) {
    console.error('Error fetching Google Fonts:', error);
    return DEFAULT_FONTS;
  }
}

/**
 * Loads a Google Font stylesheet dynamically
 */
export function loadGoogleFont(fontFamily: string): void {
  const normalizedFontFamily = fontFamily.replace(/\s+/g, '+');
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${normalizedFontFamily}:wght@400;500;700&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

/**
 * Loads multiple Google Fonts at once
 */
export function loadGoogleFonts(fontFamilies: string[]): void {
  if (!fontFamilies.length) return;
  
  const normalizedFontFamilies = fontFamilies.map(font => font.replace(/\s+/g, '+')).join('&family=');
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${normalizedFontFamilies}&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

/**
 * Gets CSS font-family value with fallbacks
 */
export function getFontFamilyStyle(fontFamily: string): string {
  const category = DEFAULT_FONTS.find(font => font.family === fontFamily)?.category || 'sans-serif';
  return `'${fontFamily}', ${category}`;
}

// Preload popular Google Fonts on app initialization
export function preloadCommonFonts(): void {
  const commonFonts = ['Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins'];
  loadGoogleFonts(commonFonts);
}