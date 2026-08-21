// frontend/src/pages/AuthModal.tsx
import { useState } from 'react';
import { signIn } from '../auth-client';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await signIn.email({ email, password });
        setLoading(false);
    };

    const handleGoogleLogin = () => {
        signIn.social({
            provider: 'google',
            callbackURL: '/dashboard'
        });
    };

    return (
        <div dir="rtl" className="max-w-md mx-auto mt-20 p-6 border rounded-lg font-sans">
            <h2 className="text-2xl font-bold mb-6 text-center">ورود به پولاریس</h2>

            <form onSubmit={handleEmailLogin} className="space-y-4">
                <input
                    type="email"
                    placeholder="ایمیل"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 border rounded"
                    required
                />
                <input
                    type="password"
                    placeholder="رمز عبور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 border rounded"
                    required
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'در حال ورود...' : 'ورود با ایمیل'}
                </button>
            </form>

            <div className="my-6 flex items-center gap-3">
                <div className="h-px bg-gray-300 flex-1" />
                <span className="text-gray-500 text-sm">یا</span>
                <div className="h-px bg-gray-300 flex-1" />
            </div>

            <button
                onClick={handleGoogleLogin}
                className="w-full p-3 bg-red-500 text-white rounded hover:bg-red-600"
            >
                ورود با گوگل
            </button>
        </div>
    );
}