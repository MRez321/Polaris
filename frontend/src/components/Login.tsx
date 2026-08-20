import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, useSession } from '../lib/auth-client';

export default function Login() {
    const { data: session } = useSession();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    if (session) {
        navigate('/dashboard');
        return null;
    }

    const handleSocialLogin = async (provider: 'google' | 'github') => {
        console.log(`Attempting to login with ${provider}...`); // Check if this appears in console
        setIsLoading(true);
        try {
            await signIn.social({
                provider,
                callbackURL: '/dashboard',
            });
        } catch (error) {
            console.error(error);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        ورود به پولاریس
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        سیستم مدیریت خیاطی و سفارشات
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    {/* Social Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleSocialLogin('google')}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5 ml-2" alt="Google" />
                            گوگل
                        </button>

                        <button
                            onClick={() => handleSocialLogin('github')}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            <img src="https://www.svgrepo.com/show/475647/github-color.svg" className="h-5 w-5 ml-2 invert" alt="GitHub" />
                            گیت‌هاب
                        </button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">یا ورود با ایمیل</span>
                        </div>
                    </div>

                    {/* Email Form Placeholder */}
                    <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <label htmlFor="email-address" className="sr-only">آدرس ایمیل</label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm text-right"
                                    placeholder="آدرس ایمیل"
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="sr-only">رمز عبور</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm text-right"
                                    placeholder="رمز عبور"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                            >
                                ورود به حساب
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}