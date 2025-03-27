import { Lightbulb } from "lucide-react";

export default function FlyerExamples() {
  return (
    <section>
      <div className="flex items-center justify-center mb-8">
        <Lightbulb className="h-6 w-6 text-amber-300 mr-2" />
        <h2 className="text-2xl font-bold text-white gradient-text">Inspire Your Design</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Example 1 */}
        <div className="glass-panel bg-black/40 overflow-hidden hover:bg-black/50 transition-all">
          <div className="aspect-[1/1.414] bg-gradient-to-br from-blue-500 to-purple-600 p-6 relative rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-black/10 backdrop-filter backdrop-blur-[2px]"></div>
            <div className="relative z-10">
              <h3 className="text-white text-2xl font-bold mb-3">SUMMER CONCERT SERIES</h3>
              <p className="text-white/90 mb-4">Join us for an unforgettable night of music under the stars</p>
              <div className="w-full h-48 bg-white/20 backdrop-blur-sm rounded-xl mb-4"></div>
              <p className="text-white/90 text-sm">Every Friday • June-August • City Park Amphitheater</p>
              <p className="text-white font-bold mt-4">Tickets starting at $25</p>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-white/70">Modern gradient with bold typography</p>
          </div>
        </div>
        
        {/* Example 2 */}
        <div className="glass-panel bg-black/40 overflow-hidden hover:bg-black/50 transition-all">
          <div className="aspect-[1/1.414] bg-gradient-to-r from-amber-500/30 to-orange-500/30 p-6 relative rounded-xl overflow-hidden">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-amber-200/60 backdrop-blur-md rounded-full mb-4"></div>
              <h3 className="text-amber-100 text-xl font-serif mb-2">Artisan Coffee Tasting</h3>
              <p className="text-amber-200 text-sm mb-6">Experience the finest selection of single-origin beans</p>
              <div className="w-full h-40 bg-amber-500/20 backdrop-blur-sm rounded-xl mb-6"></div>
              <p className="text-amber-100 text-sm">Saturday, October 15th • 2-5pm</p>
              <p className="text-amber-100 text-sm">The Roastery • 123 Main Street</p>
              <p className="text-amber-100 font-medium mt-4">RSVP Required</p>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-white/70">Warm, vintage aesthetic with serif typography</p>
          </div>
        </div>
        
        {/* Example 3 */}
        <div className="glass-panel bg-black/40 overflow-hidden hover:bg-black/50 transition-all">
          <div className="aspect-[1/1.414] bg-gradient-to-b from-slate-900/80 to-slate-800/80 p-6 relative rounded-xl overflow-hidden">
            <div className="flex flex-col justify-between h-full">
              <div>
                <h3 className="text-white text-3xl font-bold uppercase tracking-wider mb-2">TECH</h3>
                <h3 className="text-white text-3xl font-bold uppercase tracking-wider mb-4">SUMMIT</h3>
                <p className="text-white/70 text-sm">The future of innovation begins here</p>
              </div>
              <div className="w-full h-36 bg-white/10 backdrop-blur-sm rounded-xl mb-6"></div>
              <div>
                <p className="text-white text-sm mb-1">November 10-12, 2025</p>
                <p className="text-white text-sm mb-4">Innovation Center</p>
                <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-md text-white font-bold text-sm rounded-full">Register Now</div>
              </div>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-white/70">Minimal dark design with strong typography</p>
          </div>
        </div>
      </div>
    </section>
  );
}
