import { Menu, Home, LucideImage } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-4 pb-3 px-4 sm:px-6 lg:px-8">
      <div className="max-w-full mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <div>
            <h1 className="text-2xl font-semibold text-white">ha'itu</h1>
            <p className="text-xs text-white/50">AI-Powered Design</p>
          </div>
        </div>
        
        {/* Pill navigation */}
        <div className="pill-nav">
          <button className="pill-nav-item active">
            Home
          </button>
          <button className="pill-nav-item">
            Gallery
          </button>
        </div>
      </div>
    </header>
  );
}
