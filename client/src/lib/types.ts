export interface GeneratedFlyer {
  imageUrl: string;
  headline: string;
  content: string;
  stylePrompt: string;
  template: string;
}

export interface DesignVariation {
  imageBase64: string;
  style: string;
  id: number;
}

export interface DesignSuggestions {
  designs: DesignVariation[];
}

export type FlyerGenerationRequest = {
  prompt: string;
  headline: string;
  content: string;
  template: string;
  image: File;
};

export type AiFlyerGenerationRequest = {
  prompt: string;
  backgroundImage?: File;
  logo?: File;
  designCount?: number;
};
