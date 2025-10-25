export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Welcome to <span className="text-blue-600">CityFix</span>
        </h1>
        <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
          AI-powered civic complaint platform. Report issues, track progress, and help improve your city.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="/report"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Report an Issue
          </a>
          <a
            href="/dashboard"
            className="bg-white hover:bg-gray-50 text-blue-600 font-semibold px-8 py-3 rounded-lg border-2 border-blue-600 transition-colors"
          >
            View Dashboard
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="text-xl font-bold mb-2">AI-Powered Tagging</h3>
            <p className="text-gray-600">
              Upload a photo and our AI automatically identifies the issue type
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">📍</div>
            <h3 className="text-xl font-bold mb-2">Location Tracking</h3>
            <p className="text-gray-600">
              Pin issues on the map for precise location tracking
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-bold mb-2">Smart Verification</h3>
            <p className="text-gray-600">
              AI verifies issue resolution with before/after photo comparison
            </p>
          </div>
        </div>
      </section>

      {/* Stats Preview */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-center mb-8">Making a Difference</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600">1,234</div>
              <div className="text-gray-600 mt-2">Issues Reported</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600">856</div>
              <div className="text-gray-600 mt-2">Resolved</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-yellow-600">245</div>
              <div className="text-gray-600 mt-2">In Progress</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600">95%</div>
              <div className="text-gray-600 mt-2">Satisfaction</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

