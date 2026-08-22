import Navbar from '../components/Navbar';



export default function Landing() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />


// Features section
<div className="py-12">
  <h2 className="text-3xl font-bold text-center mb-8">Features</h2>
  <div className="grid md:grid-cols-3 gap-6">
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="text-indigo-600 mb-4">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
      <p className="text-gray-600">Optimized performance for seamless user experience</p>
    </div>
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="text-indigo-600 mb-4">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.001 12.001 0 0112 14c2.591 0 5.056.813 7.073 2.286" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold mb-2">Secure by Design</h3>
      <p className="text-gray-600">Enterprise-grade security for your tailoring business</p>
    </div>
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="text-indigo-600 mb-4">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold mb-2">Easy to Use</h3>
      <p className="text-gray-600">Intuitive interface designed for tailoring professionals</p>
    </div>
  </div>
</div>

// Testimonials section
<div className="py-12 bg-gray-50">
  <h2 className="text-3xl font-bold text-center mb-8">What Our Customers Say</h2>
  <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
          <span className="text-indigo-600 font-bold">JD</span>
        </div>
        <div className="ml-4">
          <h4 className="font-semibold">John Doe</h4>
          <p className="text-sm text-gray-500">Tailoring Business Owner</p>
        </div>
      </div>
      <p className="text-gray-600 italic">"Polaris transformed how I manage my tailoring business. The interface is intuitive and the features are exactly what I needed."</p>
    </div>
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
          <span className="text-indigo-600 font-bold">AS</span>
        </div>
        <div className="ml-4">
          <h4 className="font-semibold">Ahmad Safari</h4>
          <p className="text-sm text-gray-500">Professional Tailor</p>
        </div>
      </div>
      <p className="text-gray-600 italic">"The best tailoring management system I've used. Customer support is excellent and the app works flawlessly."</p>
    </div>
  </div>
</div>

// Call to Action section
<div className="py-12 bg-indigo-600">
  <div className="max-w-4xl mx-auto text-center">
    <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
    <p className="text-indigo-100 mb-8">Join thousands of tailoring professionals who trust Polaris</p>
    <button className="bg-white text-indigo-600 font-bold py-3 px-8 rounded-lg hover:bg-indigo-50 transition-colors">
      Start Free Trial
    </button>
  </div>
</div>

        </div>
    );
}