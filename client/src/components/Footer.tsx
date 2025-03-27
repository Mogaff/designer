export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} AI Flyer Generator. All rights reserved.</p>
          <div className="mt-4 md:mt-0 flex space-x-6">
            <a href="#" className="text-sm text-slate-500 hover:text-slate-700">Terms</a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-700">Privacy</a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-700">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
