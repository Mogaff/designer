export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="glass-panel py-2 px-4">
            <p className="text-sm text-white/60">&copy; {new Date().getFullYear()} AI Flyer Designer. All rights reserved.</p>
          </div>
          <div className="mt-4 md:mt-0 pill-nav">
            <a href="#" className="pill-nav-item">Terms</a>
            <a href="#" className="pill-nav-item">Privacy</a>
            <a href="#" className="pill-nav-item">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
