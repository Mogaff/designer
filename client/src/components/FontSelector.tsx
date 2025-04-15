import { useEffect, useState, useRef } from 'react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleFont, FontSettings } from '@/lib/types';
import { loadGoogleFonts, loadFont } from '@/lib/fontService';

interface FontSelectorProps {
  value: FontSettings;
  onChange: (fonts: FontSettings) => void;
}

export default function FontSelector({ value, onChange }: FontSelectorProps) {
  const [fonts, setFonts] = useState<GoogleFont[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const headingPreviewRef = useRef<HTMLDivElement>(null);
  const bodyPreviewRef = useRef<HTMLDivElement>(null);
  
  // Load fonts on component mount
  useEffect(() => {
    async function loadFonts() {
      setLoading(true);
      try {
        const googleFonts = await loadGoogleFonts();
        setFonts(googleFonts);
      } catch (error) {
        console.error('Error loading fonts:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadFonts();
  }, []);
  
  // Apply font to preview elements when selected fonts change
  useEffect(() => {
    if (headingPreviewRef.current) {
      loadFont(value.headingFont);
      headingPreviewRef.current.style.fontFamily = `"${value.headingFont}", sans-serif`;
    }
    
    if (bodyPreviewRef.current) {
      loadFont(value.bodyFont);
      bodyPreviewRef.current.style.fontFamily = `"${value.bodyFont}", sans-serif`;
    }
  }, [value.headingFont, value.bodyFont]);
  
  // Filter fonts based on search term and category
  const filteredFonts = fonts.filter(font => {
    const matchesSearch = font.family.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === 'all' || font.category === category;
    return matchesSearch && matchesCategory;
  });
  
  // Group fonts by first letter for easier browsing
  const groupedFonts: Record<string, GoogleFont[]> = {};
  filteredFonts.forEach(font => {
    const firstLetter = font.family.charAt(0).toUpperCase();
    if (!groupedFonts[firstLetter]) {
      groupedFonts[firstLetter] = [];
    }
    groupedFonts[firstLetter].push(font);
  });
  
  // Sort alphabet keys
  const sortedKeys = Object.keys(groupedFonts).sort();
  
  return (
    <div className="space-y-6">
      {/* Font Preview Area */}
      <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-lg">
        <div className="flex-1 space-y-3">
          <div className="text-sm text-white/70">Heading Font</div>
          <div 
            ref={headingPreviewRef}
            className="text-2xl font-bold text-white"
            style={{ fontFamily: `"${value.headingFont}", sans-serif` }}
          >
            The quick brown fox jumps
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div className="text-sm text-white/70">Body Font</div>
          <div 
            ref={bodyPreviewRef}
            className="text-base text-white"
            style={{ fontFamily: `"${value.bodyFont}", sans-serif` }}
          >
            The quick brown fox jumps over the lazy dog. 
            This text demonstrates how the body font will look in your designs.
          </div>
        </div>
      </div>
      
      {/* Font Selection Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Heading Font Selector */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-white">Heading Font</Label>
          <Tabs defaultValue="browse" className="w-full">
            <TabsList className="bg-white/10 text-white h-9">
              <TabsTrigger value="browse" className="data-[state=active]:bg-white/20">Browse</TabsTrigger>
              <TabsTrigger value="search" className="data-[state=active]:bg-white/20">Search</TabsTrigger>
            </TabsList>
            
            <TabsContent value="browse" className="mt-2 space-y-3">
              <div className="flex space-x-2">
                <Select 
                  value={category} 
                  onValueChange={setCategory}
                >
                  <SelectTrigger className="w-full bg-white/10 border-white/10 text-white">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="sans-serif">Sans Serif</SelectItem>
                    <SelectItem value="serif">Serif</SelectItem>
                    <SelectItem value="display">Display</SelectItem>
                    <SelectItem value="handwriting">Handwriting</SelectItem>
                    <SelectItem value="monospace">Monospace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="h-64 overflow-y-auto space-y-3 pr-2">
                {loading ? (
                  <div className="flex justify-center items-center h-full text-white/70">
                    Loading fonts...
                  </div>
                ) : (
                  <>
                    {sortedKeys.map(letter => (
                      <div key={letter} className="space-y-1">
                        <h3 className="text-xs font-bold text-white/50">{letter}</h3>
                        <div className="space-y-1">
                          {groupedFonts[letter].map(font => (
                            <button
                              key={font.family}
                              type="button"
                              onClick={() => onChange({ ...value, headingFont: font.family })}
                              className={`
                                w-full text-left px-2 py-1.5 rounded-md transition-colors
                                ${value.headingFont === font.family 
                                  ? 'bg-white/20 text-white' 
                                  : 'text-white/70 hover:bg-white/10 hover:text-white'}
                              `}
                              style={{ fontFamily: `"${font.family}", sans-serif` }}
                            >
                              {font.family}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {sortedKeys.length === 0 && (
                      <div className="text-center py-4 text-white/70">
                        No fonts found matching your criteria
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="search" className="mt-2 space-y-3">
              <Input
                type="text"
                placeholder="Search fonts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/10 border-white/10 text-white"
              />
              
              <div className="h-64 overflow-y-auto space-y-1 pr-2">
                {loading ? (
                  <div className="flex justify-center items-center h-full text-white/70">
                    Loading fonts...
                  </div>
                ) : (
                  <>
                    {filteredFonts.map(font => (
                      <button
                        key={font.family}
                        type="button"
                        onClick={() => onChange({ ...value, headingFont: font.family })}
                        className={`
                          w-full text-left px-2 py-1.5 rounded-md transition-colors
                          ${value.headingFont === font.family 
                            ? 'bg-white/20 text-white' 
                            : 'text-white/70 hover:bg-white/10 hover:text-white'}
                        `}
                        style={{ fontFamily: `"${font.family}", sans-serif` }}
                      >
                        {font.family}
                      </button>
                    ))}
                    
                    {filteredFonts.length === 0 && (
                      <div className="text-center py-4 text-white/70">
                        No fonts found matching "{searchTerm}"
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Body Font Selector */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-white">Body Font</Label>
          <Tabs defaultValue="browse" className="w-full">
            <TabsList className="bg-white/10 text-white h-9">
              <TabsTrigger value="browse" className="data-[state=active]:bg-white/20">Browse</TabsTrigger>
              <TabsTrigger value="search" className="data-[state=active]:bg-white/20">Search</TabsTrigger>
            </TabsList>
            
            <TabsContent value="browse" className="mt-2 space-y-3">
              <div className="flex space-x-2">
                <Select 
                  value={category} 
                  onValueChange={setCategory}
                >
                  <SelectTrigger className="w-full bg-white/10 border-white/10 text-white">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="sans-serif">Sans Serif</SelectItem>
                    <SelectItem value="serif">Serif</SelectItem>
                    <SelectItem value="display">Display</SelectItem>
                    <SelectItem value="handwriting">Handwriting</SelectItem>
                    <SelectItem value="monospace">Monospace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="h-64 overflow-y-auto space-y-3 pr-2">
                {loading ? (
                  <div className="flex justify-center items-center h-full text-white/70">
                    Loading fonts...
                  </div>
                ) : (
                  <>
                    {sortedKeys.map(letter => (
                      <div key={letter} className="space-y-1">
                        <h3 className="text-xs font-bold text-white/50">{letter}</h3>
                        <div className="space-y-1">
                          {groupedFonts[letter].map(font => (
                            <button
                              key={font.family}
                              type="button"
                              onClick={() => onChange({ ...value, bodyFont: font.family })}
                              className={`
                                w-full text-left px-2 py-1.5 rounded-md transition-colors
                                ${value.bodyFont === font.family 
                                  ? 'bg-white/20 text-white' 
                                  : 'text-white/70 hover:bg-white/10 hover:text-white'}
                              `}
                              style={{ fontFamily: `"${font.family}", sans-serif` }}
                            >
                              {font.family}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {sortedKeys.length === 0 && (
                      <div className="text-center py-4 text-white/70">
                        No fonts found matching your criteria
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="search" className="mt-2 space-y-3">
              <Input
                type="text"
                placeholder="Search fonts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/10 border-white/10 text-white"
              />
              
              <div className="h-64 overflow-y-auto space-y-1 pr-2">
                {loading ? (
                  <div className="flex justify-center items-center h-full text-white/70">
                    Loading fonts...
                  </div>
                ) : (
                  <>
                    {filteredFonts.map(font => (
                      <button
                        key={font.family}
                        type="button"
                        onClick={() => onChange({ ...value, bodyFont: font.family })}
                        className={`
                          w-full text-left px-2 py-1.5 rounded-md transition-colors
                          ${value.bodyFont === font.family 
                            ? 'bg-white/20 text-white' 
                            : 'text-white/70 hover:bg-white/10 hover:text-white'}
                        `}
                        style={{ fontFamily: `"${font.family}", sans-serif` }}
                      >
                        {font.family}
                      </button>
                    ))}
                    
                    {filteredFonts.length === 0 && (
                      <div className="text-center py-4 text-white/70">
                        No fonts found matching "{searchTerm}"
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}