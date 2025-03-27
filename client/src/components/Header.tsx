import { Sparkles, ImageIcon, Home } from "lucide-react";

export default function Header() {
  return (
    <header className="pt-6 pb-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="glass-panel p-2.5">
            <Sparkles className="h-7 w-7 text-rose-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white gradient-text">AI Flyer Generator</h1>
            <p className="text-xs text-white/70">Powered by Google Gemini</p>
          </div>
        </div>
        
        {/* Pill-shaped navigation */}
        <div className="pill-nav">
          <button className="pill-nav-item active">
            <Home className="h-4 w-4 mr-1" /> 
            Home
          </button>
          <button className="pill-nav-item">
            <ImageIcon className="h-4 w-4 mr-1" />
            Gallery
          </button>
          <button className="pill-nav-item">
            <Sparkles className="h-4 w-4 mr-1" />
            AI Lab
          </button>
        </div>
        
        {/* Status badge */}
        <div className="flex items-center space-x-3">
          <span className="pill-container bg-black/30 text-xs text-rose-300 font-medium">
            <Sparkles className="h-3 w-3" /> Powered by AI
          </span>
        </div>
      </div>
    </header>
  );
}
