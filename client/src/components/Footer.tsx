export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10">
      <div className="max-w-full mx-auto py-1 px-6 lg:px-12">
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-white/40">&copy; {new Date().getFullYear()} ha'itu</p>
          <div className="flex space-x-3">
            <a href="#" className="text-[10px] text-white/40 hover:text-white/70">Terms</a>
            <a href="#" className="text-[10px] text-white/40 hover:text-white/70">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
