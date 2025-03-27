export default function FlyerExamples() {
  return (
    <section className="mt-16 mb-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Inspire Your Design</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">Check out these example flyers to get ideas for your own creation</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Example 1 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="aspect-[1/1.414] bg-gradient-to-br from-blue-500 to-purple-600 p-6 relative">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <h3 className="text-white text-2xl font-bold mb-3">SUMMER CONCERT SERIES</h3>
              <p className="text-white/90 mb-4">Join us for an unforgettable night of music under the stars</p>
              <div className="w-full h-48 bg-white/20 backdrop-blur-sm rounded mb-4"></div>
              <p className="text-white/90 text-sm">Every Friday • June-August • City Park Amphitheater</p>
              <p className="text-white font-bold mt-4">Tickets starting at $25</p>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-600">Modern gradient with bold typography</p>
          </div>
        </div>
        
        {/* Example 2 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="aspect-[1/1.414] bg-amber-50 p-6 relative">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-amber-200 rounded-full mb-4"></div>
              <h3 className="text-amber-900 text-xl font-serif mb-2">Artisan Coffee Tasting</h3>
              <p className="text-amber-800 text-sm mb-6">Experience the finest selection of single-origin beans</p>
              <div className="w-full h-40 bg-amber-100 rounded-lg mb-6"></div>
              <p className="text-amber-800 text-sm">Saturday, October 15th • 2-5pm</p>
              <p className="text-amber-800 text-sm">The Roastery • 123 Main Street</p>
              <p className="text-amber-900 font-medium mt-4">RSVP Required</p>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-600">Warm, vintage aesthetic with serif typography</p>
          </div>
        </div>
        
        {/* Example 3 */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="aspect-[1/1.414] bg-slate-900 p-6 relative">
            <div className="flex flex-col justify-between h-full">
              <div>
                <h3 className="text-white text-3xl font-bold uppercase tracking-wider mb-2">TECH</h3>
                <h3 className="text-white text-3xl font-bold uppercase tracking-wider mb-4">SUMMIT</h3>
                <p className="text-slate-300 text-sm">The future of innovation begins here</p>
              </div>
              <div className="w-full h-36 bg-slate-800 rounded mb-6"></div>
              <div>
                <p className="text-white text-sm mb-1">November 10-12, 2023</p>
                <p className="text-white text-sm mb-4">Innovation Center</p>
                <div className="inline-block px-4 py-2 bg-white text-slate-900 font-bold text-sm">Register Now</div>
              </div>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-600">Minimal dark design with strong typography</p>
          </div>
        </div>
      </div>
    </section>
  );
}
