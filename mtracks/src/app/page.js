export default function Home() {
  return (
    <main className="flex h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="max-w-md">
        {/* Logo Icon */}
        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        {/* Main heading */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">MK-Tracker</h1>

        {/* Subtitle */}
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          Track live locations in real time. Share your link to friends and get their real time location.
        </p>

        {/* Features list */}
        <div className="space-y-3 mb-8 text-left">
          <div className="flex items-center gap-3 text-gray-700">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">Real-time location tracking</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm">Track up to 5 devices simultaneously</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-sm">Secure and private</span>
          </div>
        </div>

        {/* CTA Button */}
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-semibold shadow-sm transition-colors"
        >
          <span>Go to Dashboard</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </div>
    </main>
  );
}