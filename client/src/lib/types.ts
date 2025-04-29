export interface GeneratedFlyer {
  imageUrl: string;
  headline: string;
  content: string;
  stylePrompt: string;
  template: string;
  fontSettings?: FontSettings;
}

export interface DesignVariation {
  imageBase64: string;
  style: string;
  id: number;
}

export interface DesignSuggestions {
  designs: DesignVariation[];
}

export interface FontSettings {
  headingFont: string;
  bodyFont: string;
}

export interface GoogleFont {
  family: string;
  variants: string[];
  category: string;
}

export type FlyerGenerationRequest = {
  prompt: string;
  headline: string;
  content: string;
  template: string;
  image: File;
  fontSettings?: FontSettings;
};

export interface TemplateInfo {
  name: string;
  category: string;
  tags: string;
  description: string;
  glassMorphism: boolean;
  neonEffects: boolean;
}

export type AiFlyerGenerationRequest = {
  prompt: string;
  backgroundImage?: File;
  logo?: File;
  designCount?: number;
  aspectRatio?: string;
  fontSettings?: FontSettings;
  templateInfo?: TemplateInfo;
};

export interface BrandKit {
  id: number;
  user_id: number;
  name: string;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  heading_font: string | null;
  body_font: string | null;
  brand_voice: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface DesignTemplate {
  id: string;
  name: string;
  previewUrl: string;
  category: string;
  tags: string[];
  isPremium: boolean;
  isNew: boolean;
  isTrending: boolean;
  description: string;
  styleData?: {
    cssCode?: string;
    htmlTemplate?: string;
    glassEffects?: boolean;
    glassMorphism?: boolean;
    neonEffects?: boolean;
    specialEffects?: string[];
    glitchEffects?: boolean;
    duotone?: boolean;
    gradientType?: string;
    specialShapes?: string[];
    effectLevel?: "minimal" | "medium" | "heavy" | "light";
  };
}
