import { Link } from 'react-router-dom';
import { useSession } from '../lib/auth-client';

export default function Navbar() {
    const { data: session } = useSession();

    return (
        <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="text-2xl font-bold text-indigo-600">
                            Polaris
                        </Link>
                    </div>
                    <div className="flex items-center">
                        {session ? (
                            <Link
                                to="/dashboard"
                                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <Link
                                to="/login"
                                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}