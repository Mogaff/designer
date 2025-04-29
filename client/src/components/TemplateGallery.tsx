import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Star, Sparkles, Clock, TrendingUp, Filter, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DesignTemplate } from "@/lib/types";

// Sample template data
// Import local assets
import gradientBg from "@assets/background-gradient.png";
import meshGradient11 from "@assets/image-mesh-gradient (11).png";
import meshGradient13 from "@assets/image-mesh-gradient (13).png";
import meshGradient18 from "@assets/image-mesh-gradient (18).png";
import meshGradient20 from "@assets/image-mesh-gradient (20).png";
import designExample1 from "@assets/design-1743547737777.png";
import designExample2 from "@assets/design-1743547911385.png";
import fashionFlyer from "@assets/Fashion-Week-Flyer-by-muhamadiqbalhidayat.jpg";

const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: "neomorphic-1",
    name: "Neomorphic Glass",
    previewUrl: meshGradient13,
    category: "Modern",
    tags: ["glass", "blur", "morphic", "abstract"],
    isPremium: false,
    isNew: true,
    isTrending: true,
    description: "Clean design with neomorphic glass elements and soft shadows",
    styleData: {
      glassMorphism: true,
      effectLevel: "medium",
      specialShapes: ["rounded", "blur", "shadow"],
    }
  },
  {
    id: "gradient-flow-1",
    name: "Gradient Flow",
    previewUrl: gradientBg,
    category: "Abstract",
    tags: ["gradients", "flow", "vibrant", "colorful"],
    isPremium: false,
    isNew: false,
    isTrending: true,
    description: "Colorful flowing gradients with smooth transitions",
    styleData: {
      gradientType: "flowing",
      effectLevel: "medium",
      specialShapes: ["rounded", "fluid"]
    }
  },
  {
    id: "brutalist-1",
    name: "Neo Brutalist",
    previewUrl: designExample1,
    category: "Creative",
    tags: ["brutalist", "bold", "contrast", "minimal"],
    isPremium: true,
    isNew: true,
    isTrending: false,
    description: "Bold brutalist design with strong contrasts and geometric shapes",
    styleData: {
      effectLevel: "heavy",
      specialShapes: ["geometric", "angular", "bold"]
    }
  },
  {
    id: "3d-morph-1",
    name: "3D Morphic",
    previewUrl: meshGradient18,
    category: "3D",
    tags: ["3d", "depth", "morph", "futuristic"],
    isPremium: true,
    isNew: false,
    isTrending: true,
    description: "Three-dimensional morphing elements with depth and perspective",
    styleData: {
      effectLevel: "heavy",
      specialShapes: ["3d", "depth", "shadow"],
      glassMorphism: false
    }
  },
  {
    id: "liquid-1",
    name: "Liquid Flow",
    previewUrl: meshGradient11,
    category: "Abstract",
    tags: ["liquid", "flow", "fluid", "organic"],
    isPremium: false,
    isNew: false,
    isTrending: false,
    description: "Fluid, organic shapes with liquid-like flowing aesthetics",
    styleData: {
      effectLevel: "medium",
      specialShapes: ["fluid", "organic", "flow"]
    }
  },
  {
    id: "kinetic-1",
    name: "Kinetic Typography",
    previewUrl: designExample2,
    category: "Typography",
    tags: ["typography", "dynamic", "motion", "text"],
    isPremium: true,
    isNew: true,
    isTrending: true,
    description: "Dynamic typography layouts with kinetic energy and movement",
    styleData: {
      specialEffects: ["text-motion", "kinetic"],
      effectLevel: "medium"
    }
  },
  {
    id: "neon-glow-1",
    name: "Neon Glow",
    previewUrl: meshGradient20,
    category: "Vibrant",
    tags: ["neon", "glow", "vibrant", "dark"],
    isPremium: false,
    isNew: false,
    isTrending: true,
    description: "Vibrant neon elements with glowing effects on dark backgrounds",
    styleData: {
      neonEffects: true,
      effectLevel: "medium",
      specialShapes: ["glow", "neon", "vibrant"]
    }
  },
  {
    id: "cyberpunk-1",
    name: "Cyberpunk Tech",
    previewUrl: fashionFlyer, 
    category: "Futuristic",
    tags: ["cyberpunk", "tech", "futuristic", "glitch"],
    isPremium: true,
    isNew: true,
    isTrending: false,
    description: "Futuristic cyberpunk aesthetics with tech elements and glitch effects",
    styleData: {
      glitchEffects: true,
      neonEffects: true,
      effectLevel: "heavy"
    }
  },
  {
    id: "glassmorphism-1",
    name: "Glassmorphism",
    previewUrl: gradientBg,
    category: "Modern",
    tags: ["glass", "transparency", "blur", "minimal"],
    isPremium: false,
    isNew: false,
    isTrending: true,
    description: "Modern design with frosted glass effects and background blur",
    styleData: {
      glassMorphism: true,
      effectLevel: "medium",
      specialShapes: ["rounded", "blur", "translucent"]
    }
  },
  {
    id: "abstract-shapes-1",
    name: "Abstract Shapes",
    previewUrl: designExample2,
    category: "Abstract",
    tags: ["abstract", "shapes", "geometric", "colorful"],
    isPremium: false,
    isNew: true,
    isTrending: false,
    description: "Colorful abstract geometric shapes with dynamic compositions",
    styleData: {
      effectLevel: "medium",
      specialShapes: ["geometric", "abstract"]
    }
  },
  {
    id: "isometric-1",
    name: "Isometric World",
    previewUrl: meshGradient11,
    category: "3D",
    tags: ["isometric", "3d", "geometric", "perspective"],
    isPremium: true,
    isNew: false,
    isTrending: true,
    description: "Isometric design with 3D perspective and geometric elements",
    styleData: {
      effectLevel: "heavy",
      specialShapes: ["3d", "isometric", "perspective"]
    }
  },
  {
    id: "duotone-1",
    name: "Duotone Style",
    previewUrl: designExample1,
    category: "Minimalist",
    tags: ["duotone", "two-color", "contrast", "clean"],
    isPremium: false,
    isNew: false,
    isTrending: false,
    description: "Clean duotone visual style with two-color gradient effects",
    styleData: {
      effectLevel: "light",
      specialShapes: ["minimal", "clean"],
      duotone: true
    }
  }
];

type TemplateGalleryProps = {
  onSelectTemplate: (template: DesignTemplate) => void;
  onClose: () => void;
};

export default function TemplateGallery({ onSelectTemplate, onClose }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [showTrendingOnly, setShowTrendingOnly] = useState(false);

  // Get unique categories
  const categories = Array.from(new Set(DESIGN_TEMPLATES.map(template => template.category)));

  // Filter templates based on search, category, and other filters
  const filteredTemplates = DESIGN_TEMPLATES.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory ? template.category === selectedCategory : true;
    const matchesPremium = showPremiumOnly ? template.isPremium : true;
    const matchesNew = showNewOnly ? template.isNew : true;
    const matchesTrending = showTrendingOnly ? template.isTrending : true;

    return matchesSearch && matchesCategory && matchesPremium && matchesNew && matchesTrending;
  });

  return (
    <div className="flex flex-col h-full bg-black/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">Design Templates</h2>
        {/* Der X-Button wird nun automatisch von der DialogContent-Komponente bereitgestellt */}
      </div>
      
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
          <Input
            type="text"
            placeholder="Search templates by name, style or elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/50"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={selectedCategory === null ? "default" : "outline"}
            className={`cursor-pointer ${selectedCategory === null ? 'bg-indigo-500' : 'hover:bg-white/10'}`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Badge>
          {categories.map(category => (
            <Badge
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              className={`cursor-pointer ${selectedCategory === category ? 'bg-indigo-500' : 'hover:bg-white/10'}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Label className="flex items-center gap-1.5 text-sm text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={showPremiumOnly}
              onChange={() => setShowPremiumOnly(!showPremiumOnly)}
              className="w-3.5 h-3.5 rounded border-white/30 text-indigo-500"
            />
            <Star className="h-3.5 w-3.5 text-amber-400" />
            Premium
          </Label>
          
          <Label className="flex items-center gap-1.5 text-sm text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={showNewOnly}
              onChange={() => setShowNewOnly(!showNewOnly)}
              className="w-3.5 h-3.5 rounded border-white/30 text-indigo-500"
            />
            <Sparkles className="h-3.5 w-3.5 text-green-400" />
            New
          </Label>
          
          <Label className="flex items-center gap-1.5 text-sm text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={showTrendingOnly}
              onChange={() => setShowTrendingOnly(!showTrendingOnly)}
              className="w-3.5 h-3.5 rounded border-white/30 text-indigo-500"
            />
            <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
            Trending
          </Label>
        </div>
      </div>
      
      <ScrollArea className="flex-grow overflow-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
          {filteredTemplates.map(template => (
            <div 
              key={template.id}
              className="group relative rounded-lg overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition-all hover:shadow-md hover:shadow-indigo-500/20 hover:border-indigo-500/40 cursor-pointer"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="aspect-[4/3] relative overflow-hidden rounded-t-lg">
                <img 
                  src={template.previewUrl} 
                  alt={template.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                
                {/* Style-based overlay for better style representation */}
                <div 
                  className={`absolute inset-0 pointer-events-none ${
                    // Base styling
                    "after:content-[''] after:absolute after:inset-0"
                  } ${
                    // Glass morphism effect
                    template.styleData?.glassMorphism 
                      ? "after:backdrop-blur-md after:bg-white/10 after:border after:border-white/20 after:rounded-md" 
                      : ""
                  } ${
                    // Neon effects
                    template.styleData?.neonEffects 
                      ? "after:shadow-[0_0_15px_rgba(140,100,255,0.5)] after:box-shadow-xl" 
                      : ""
                  } ${
                    // Duotone effect
                    template.styleData?.duotone
                      ? "after:bg-gradient-to-br after:from-indigo-500/30 after:to-purple-500/30 after:mix-blend-color-burn"
                      : ""
                  } ${
                    // Effect intensity levels
                    template.styleData?.effectLevel === "light"
                      ? "opacity-30"
                      : template.styleData?.effectLevel === "medium"
                      ? "opacity-60"
                      : template.styleData?.effectLevel === "heavy"
                      ? "opacity-80"
                      : ""
                  } ${
                    // Glitch effects
                    template.styleData?.glitchEffects
                      ? "after:animate-pulse after:bg-gradient-to-r after:from-transparent after:via-cyan-500/20 after:to-transparent"
                      : ""
                  }`}
                >
                  {/* Inset shape elements to demonstrate style */}
                  {template.styleData?.specialShapes?.includes("geometric") && (
                    <div className="absolute left-[15%] top-[30%] w-16 h-16 bg-purple-500/40 rotate-45 backdrop-blur-sm"></div>
                  )}
                  
                  {template.styleData?.specialShapes?.includes("fluid") && (
                    <div className="absolute right-[20%] bottom-[20%] w-20 h-14 bg-blue-500/30 rounded-[60%] blur-md transform rotate-12"></div>
                  )}
                  
                  {template.styleData?.neonEffects && (
                    <div className="absolute left-[25%] bottom-[25%] w-12 h-1 bg-cyan-400 blur-sm shadow-[0_0_10px_#22d3ee]"></div>
                  )}

                  {template.styleData?.specialShapes?.includes("3d") && (
                    <div className="absolute right-[25%] top-[20%] w-10 h-10 bg-indigo-600/40 transform rotate-[30deg] skew-y-[20deg] backdrop-blur-sm"></div>
                  )}
                </div>
                
                {template.isPremium && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge className="bg-amber-500 hover:bg-amber-500 text-white rounded-md font-semibold py-0.5 px-2">
                      <Star className="h-3 w-3 mr-1" /> Premium
                    </Badge>
                  </div>
                )}
                {template.isNew && (
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className="bg-green-500 hover:bg-green-500 text-white rounded-md font-semibold py-0.5 px-2">
                      New
                    </Badge>
                  </div>
                )}
              </div>
              
              <div className="p-3">
                <h3 className="font-medium text-white mb-1">{template.name}</h3>
                <p className="text-white/60 text-xs">{template.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {template.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-[10px] py-0 px-1.5 text-white/70 border-white/20">
                      {tag}
                    </Badge>
                  ))}
                  {template.tags.length > 3 && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-white/70 border-white/20">
                      +{template.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button className="bg-indigo-500/90 hover:bg-indigo-500 text-white shadow-md">
                  <Check className="h-4 w-4 mr-2" />
                  Use Template
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {filteredTemplates.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center text-white/60">
            <Filter className="h-12 w-12 mb-3 opacity-50" />
            <h3 className="text-lg font-medium text-white">No templates found</h3>
            <p className="mt-1">Try adjusting your filters or search query</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}