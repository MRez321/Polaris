import Navbar from '../components/Navbar';

export default function Landing() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {/* Placeholder Content */}
            <div className="max-w-7xl mx-auto px-4 py-24 text-center">
                <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
                    Polaris Style
                </h1>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                    Professional tailoring management system.
                </p>

                <div className="mt-12 p-8 bg-white rounded-xl shadow-sm border border-gray-100 max-w-3xl mx-auto">
                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                        [ Main Content Placeholder ]
                    </div>
                </div>
            </div>
        </div>
    );
}