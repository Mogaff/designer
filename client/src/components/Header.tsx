import { Menu, Home, LucideImage } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-2 pb-2 px-4 sm:px-6 lg:px-8">
      <div className="max-w-full mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <div>
            <h1 className="text-xl font-semibold text-white">ha'itu</h1>
            <p className="text-[10px] text-white/50">AI-Powered Design</p>
          </div>
        </div>
        
        {/* Pill navigation */}
        <div className="pill-nav">
          <button className="pill-nav-item active text-xs py-1 px-3">
            Home
          </button>
          <button className="pill-nav-item text-xs py-1 px-3">
            Gallery
          </button>
        </div>
      </div>
    </header>
  );
}
