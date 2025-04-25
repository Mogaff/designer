import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Star, Sparkles, Clock, TrendingUp, Filter, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DesignTemplate } from "@/lib/types";

// Sample template data
const DESIGN_TEMPLATES: DesignTemplate[] = [
  {
    id: "neomorphic-1",
    name: "Neomorphic Glass",
    previewUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2064&auto=format&fit=crop",
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
    previewUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2064&auto=format&fit=crop",
    category: "Abstract",
    tags: ["gradients", "flow", "vibrant", "colorful"],
    isPremium: false,
    isNew: false,
    isTrending: true,
    description: "Colorful flowing gradients with smooth transitions"
  },
  {
    id: "brutalist-1",
    name: "Neo Brutalist",
    previewUrl: "https://images.unsplash.com/photo-1614850523459-c2f4c699c32a?q=80&w=2070&auto=format&fit=crop",
    category: "Creative",
    tags: ["brutalist", "bold", "contrast", "minimal"],
    isPremium: true,
    isNew: true,
    isTrending: false,
    description: "Bold brutalist design with strong contrasts and geometric shapes"
  },
  {
    id: "3d-morph-1",
    name: "3D Morphic",
    previewUrl: "https://images.unsplash.com/photo-1633280966435-eb8be57ea565?q=80&w=2072&auto=format&fit=crop",
    category: "3D",
    tags: ["3d", "depth", "morph", "futuristic"],
    isPremium: true,
    isNew: false,
    isTrending: true,
    description: "Three-dimensional morphing elements with depth and perspective"
  },
  {
    id: "liquid-1",
    name: "Liquid Flow",
    previewUrl: "https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=1974&auto=format&fit=crop",
    category: "Abstract",
    tags: ["liquid", "flow", "fluid", "organic"],
    isPremium: false,
    isNew: false,
    isTrending: false,
    description: "Fluid, organic shapes with liquid-like flowing aesthetics"
  },
  {
    id: "kinetic-1",
    name: "Kinetic Typography",
    previewUrl: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1935&auto=format&fit=crop",
    category: "Typography",
    tags: ["typography", "dynamic", "motion", "text"],
    isPremium: true,
    isNew: true,
    isTrending: true,
    description: "Dynamic typography layouts with kinetic energy and movement"
  },
  {
    id: "neon-glow-1",
    name: "Neon Glow",
    previewUrl: "https://images.unsplash.com/photo-1637611331620-51149c7ceb94?q=80&w=2070&auto=format&fit=crop",
    category: "Vibrant",
    tags: ["neon", "glow", "vibrant", "dark"],
    isPremium: false,
    isNew: false,
    isTrending: true,
    description: "Vibrant neon elements with glowing effects on dark backgrounds"
  },
  {
    id: "cyberpunk-1",
    name: "Cyberpunk Tech",
    previewUrl: "https://images.unsplash.com/photo-1621075160523-b936ad96132a?q=80&w=2070&auto=format&fit=crop", 
    category: "Futuristic",
    tags: ["cyberpunk", "tech", "futuristic", "glitch"],
    isPremium: true,
    isNew: true,
    isTrending: false,
    description: "Futuristic cyberpunk aesthetics with tech elements and glitch effects"
  },
  {
    id: "glassmorphism-1",
    name: "Glassmorphism",
    previewUrl: "https://images.unsplash.com/photo-1545153996-e01b50d6ec0f?q=80&w=1974&auto=format&fit=crop",
    category: "Modern",
    tags: ["glass", "transparency", "blur", "minimal"],
    isPremium: false,
    isNew: false,
    isTrending: true,
    description: "Modern design with frosted glass effects and background blur"
  },
  {
    id: "abstract-shapes-1",
    name: "Abstract Shapes",
    previewUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1940&auto=format&fit=crop",
    category: "Abstract",
    tags: ["abstract", "shapes", "geometric", "colorful"],
    isPremium: false,
    isNew: true,
    isTrending: false,
    description: "Colorful abstract geometric shapes with dynamic compositions"
  },
  {
    id: "isometric-1",
    name: "Isometric World",
    previewUrl: "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=80&w=1940&auto=format&fit=crop",
    category: "3D",
    tags: ["isometric", "3d", "geometric", "perspective"],
    isPremium: true,
    isNew: false,
    isTrending: true,
    description: "Isometric design with 3D perspective and geometric elements"
  },
  {
    id: "duotone-1",
    name: "Duotone Style",
    previewUrl: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=1974&auto=format&fit=crop",
    category: "Minimalist",
    tags: ["duotone", "two-color", "contrast", "clean"],
    isPremium: false,
    isNew: false,
    isTrending: false,
    description: "Clean duotone visual style with two-color gradient effects"
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
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          Close
        </Button>
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
                {template.isPremium && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-amber-500 hover:bg-amber-500 text-white rounded-md font-semibold py-0.5 px-2">
                      <Star className="h-3 w-3 mr-1" /> Premium
                    </Badge>
                  </div>
                )}
                {template.isNew && (
                  <div className="absolute top-2 left-2">
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