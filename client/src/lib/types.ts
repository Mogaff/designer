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

export type AiFlyerGenerationRequest = {
  prompt: string;
  backgroundImage?: File;
  logo?: File;
  designCount?: number;
  aspectRatio?: string;
  fontSettings?: FontSettings;
};
