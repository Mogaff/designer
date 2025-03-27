export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-8 w-8 text-primary" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
            />
          </svg>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">AI Flyer Generator</h1>
            <p className="text-xs text-slate-500">Powered by Google Gemini</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
            AI Powered
          </span>
          <span className="text-sm text-slate-600">
            Create flyers with just a text prompt
          </span>
        </div>
      </div>
    </header>
  );
}
