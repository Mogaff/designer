import { DesignVariation } from "@/lib/types";

declare global {
  interface Window {
    designSuggestions: DesignVariation[] | null;
    setShowTransformation: (show: boolean) => void;
    isCarouselView: boolean;
  }
}

export {};