export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10">
      <div className="max-w-full mx-auto py-3 px-6 lg:px-12">
        <div className="flex justify-between items-center">
          <p className="text-xs text-white/40">&copy; {new Date().getFullYear()} ha'itu</p>
          <div className="flex space-x-4">
            <a href="#" className="text-xs text-white/40 hover:text-white/70">Terms</a>
            <a href="#" className="text-xs text-white/40 hover:text-white/70">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
