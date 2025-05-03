declare module 'webfontloader' {
  interface WebFontConfig {
    /** 
     * Google Fonts configuration
     */
    google?: {
      families: string[];
      text?: string;
      api?: string;
    };
    /** 
     * Custom fonts configuration
     */
    custom?: {
      families: string[];
      urls: string[];
      testStrings?: { [key: string]: string };
    };
    /** 
     * TypeKit fonts configuration
     */
    typekit?: {
      id?: string;
      api?: string;
    };
    /** 
     * Fontdeck fonts configuration
     */
    fontdeck?: {
      id: string;
    };
    /** 
     * Fonts.com (Monotype) configuration
     */
    monotype?: {
      projectId: string;
      version?: number;
      loadAllFonts?: boolean;
    };
    /** 
     * Event handlers
     */
    loading?: () => void;
    active?: () => void;
    inactive?: () => void;
    fontloading?: (familyName: string, fvd: string) => void;
    fontactive?: (familyName: string, fvd: string) => void;
    fontinactive?: (familyName: string, fvd: string) => void;
    /** 
     * Optional timeout in milliseconds
     */
    timeout?: number;
    /** 
     * Font loading strategy
     */
    classes?: boolean;
    events?: boolean;
    context?: any;
  }

  /**
   * Load specified fonts
   */
  export function load(config: WebFontConfig): void;
}