import { useSession, signOut } from '../lib/auth-client';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const { data: session } = useSession();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    if (!session) return null;

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="md:flex">
                    <div className="md:flex-shrink-0">
                        <img
                            className="h-48 w-full object-cover md:w-48"
                            src={session.user.image || 'https://via.placeholder.com/150'}
                            alt="Profile"
                        />
                    </div>
                    <div className="p-8">
                        <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
                            {session.user.role === 'admin' ? 'مدیر سیستم' : 'کاربر'}
                        </div>
                        <h1 className="block mt-1 text-2xl leading-tight font-bold text-black">
                            {session.user.name}
                        </h1>
                        <p className="mt-2 text-gray-500">{session.user.email}</p>

                        <div className="mt-6 flex gap-4">
                            <button
                                onClick={handleLogout}
                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                            >
                                خروج از حساب
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}