export interface GeneratedFlyer {
  imageUrl: string;
  headline: string;
  content: string;
  stylePrompt: string;
  template: string;
}

export type FlyerGenerationRequest = {
  prompt: string;
  headline: string;
  content: string;
  template: string;
  image: File;
};
