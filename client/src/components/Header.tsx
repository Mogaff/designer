import { Menu, Home, LucideImage } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-6 pb-4 px-4 sm:px-6 lg:px-8 bg-black/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
        <div className="flex items-center">
          <div>
            <h1 className="text-2xl font-semibold text-white">ha'itu</h1>
            <p className="text-xs text-white/50">AI-Powered Design</p>
          </div>
        </div>
        
        {/* Minimal navigation */}
        <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-md p-1 flex items-center">
          <button className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-all rounded-sm">
            Home
          </button>
          <button className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-all rounded-sm">
            Gallery
          </button>
        </div>
        
        {/* Menu button for mobile */}
        <div className="flex items-center space-x-3">
          <button className="btn-glass">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
