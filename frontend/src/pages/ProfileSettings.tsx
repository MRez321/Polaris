import { useSession, linkSocial, unlinkAccount } from '../lib/auth-client';

export default function ProfileSettings() {
    const { data: session } = useSession();

    const handleLink = async (provider: 'google' | 'github') => {
        await linkSocial({ provider, callbackURL: '/profile' });
    };

    if (!session) return null;

    // Check which accounts are already linked
    const hasGoogle = session.user.accounts?.some((acc: any) => acc.providerId === 'google');
    const hasGithub = session.user.accounts?.some((acc: any) => acc.providerId === 'github');

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">مدیریت حساب‌های متصل</h2>
            <div className="space-y-4">
                <div className="flex justify-between items-center p-3 border rounded">
                    <span>گوگل</span>
                    {hasGoogle ? (
                        <span className="text-green-600 text-sm">متصل است</span>
                    ) : (
                        <button onClick={() => handleLink('google')} className="text-indigo-600 text-sm">اتصال</button>
                    )}
                </div>
                <div className="flex justify-between items-center p-3 border rounded">
                    <span>گیت‌هاب</span>
                    {hasGithub ? (
                        <span className="text-green-600 text-sm">متصل است</span>
                    ) : (
                        <button onClick={() => handleLink('github')} className="text-indigo-600 text-sm">اتصال</button>
                    )}
                </div>
            </div>
        </div>
    );
}