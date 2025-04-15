import { useState, useEffect } from 'react';
import { GoogleFont, FontSettings } from '@/lib/types';
import { fetchGoogleFonts, loadGoogleFont } from '@/lib/fontService';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';

interface FontSelectorProps {
  value: FontSettings;
  onChange: (fonts: FontSettings) => void;
}

export default function FontSelector({ value, onChange }: FontSelectorProps) {
  const [fonts, setFonts] = useState<GoogleFont[]>([]);
  const [filteredFonts, setFilteredFonts] = useState<GoogleFont[]>([]);
  const [fontCategory, setFontCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Load Google Fonts
  useEffect(() => {
    async function loadFonts() {
      setIsLoading(true);
      try {
        const googleFonts = await fetchGoogleFonts();
        setFonts(googleFonts);
        setFilteredFonts(googleFonts);
      } catch (error) {
        console.error('Error loading fonts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadFonts();
  }, []);

  // Filter fonts by category
  useEffect(() => {
    if (fontCategory === 'all') {
      setFilteredFonts(fonts);
    } else {
      setFilteredFonts(fonts.filter(font => font.category === fontCategory));
    }
  }, [fontCategory, fonts]);

  // Load selected fonts dynamically when they change
  useEffect(() => {
    if (value.headingFont) {
      loadGoogleFont(value.headingFont);
    }
    if (value.bodyFont) {
      loadGoogleFont(value.bodyFont);
    }
  }, [value.headingFont, value.bodyFont]);

  // Handle font selection
  const handleHeadingFontChange = (fontFamily: string) => {
    onChange({
      ...value,
      headingFont: fontFamily
    });
  };

  const handleBodyFontChange = (fontFamily: string) => {
    onChange({
      ...value,
      bodyFont: fontFamily
    });
  };

  return (
    <div className="font-selector space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fontCategory" className="text-xs font-medium text-white/70">
          Font Category
        </Label>
        <Tabs 
          defaultValue="all" 
          value={fontCategory} 
          onValueChange={setFontCategory}
          className="w-full"
        >
          <TabsList className="grid grid-cols-5 h-9 bg-white/10 backdrop-blur-sm">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="sans-serif" className="text-xs">Sans-Serif</TabsTrigger>
            <TabsTrigger value="serif" className="text-xs">Serif</TabsTrigger>
            <TabsTrigger value="monospace" className="text-xs">Monospace</TabsTrigger>
            <TabsTrigger value="handwriting" className="text-xs">Handwriting</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Heading Font */}
        <div className="space-y-1">
          <Label htmlFor="headingFont" className="text-xs font-medium text-white/70">
            Heading Font
          </Label>
          <Select
            value={value.headingFont || ''}
            onValueChange={handleHeadingFontChange}
            disabled={isLoading}
          >
            <SelectTrigger 
              id="headingFont" 
              className="bg-white/10 backdrop-blur-sm border-white/10 text-white h-10"
            >
              <SelectValue 
                placeholder="Select a font" 
                className="text-white"
              />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1836] border-white/10 text-white max-h-[300px]">
              {filteredFonts.map((font) => (
                <SelectItem 
                  key={font.family} 
                  value={font.family}
                  style={{ fontFamily: `'${font.family}', ${font.category}` }}
                >
                  {font.family}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Font Preview */}
          {value.headingFont && (
            <div 
              className="mt-2 p-2 bg-black/20 backdrop-blur-sm rounded text-white text-xl"
              style={{ fontFamily: `'${value.headingFont}', sans-serif` }}
            >
              {value.headingFont}
            </div>
          )}
        </div>

        {/* Body Font */}
        <div className="space-y-1">
          <Label htmlFor="bodyFont" className="text-xs font-medium text-white/70">
            Body Font
          </Label>
          <Select
            value={value.bodyFont || ''}
            onValueChange={handleBodyFontChange}
            disabled={isLoading}
          >
            <SelectTrigger 
              id="bodyFont" 
              className="bg-white/10 backdrop-blur-sm border-white/10 text-white h-10"
            >
              <SelectValue 
                placeholder="Select a font" 
                className="text-white"
              />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1836] border-white/10 text-white max-h-[300px]">
              {filteredFonts.map((font) => (
                <SelectItem 
                  key={font.family} 
                  value={font.family}
                  style={{ fontFamily: `'${font.family}', ${font.category}` }}
                >
                  {font.family}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Font Preview */}
          {value.bodyFont && (
            <div 
              className="mt-2 p-2 bg-black/20 backdrop-blur-sm rounded text-white text-base"
              style={{ fontFamily: `'${value.bodyFont}', sans-serif` }}
            >
              {value.bodyFont} - The quick brown fox jumps over the lazy dog.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}