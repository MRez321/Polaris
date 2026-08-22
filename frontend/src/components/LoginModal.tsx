import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, DialogTrigger, DialogPopup, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

export default function LoginModal() {
    const { login, register, showLoginModal, setShowLoginModal } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(name, email, password);
            }
            setShowLoginModal(false);
            // Reset form
            setEmail('');
            setPassword('');
            setName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setShowLoginModal(false);
        setError('');
        setEmail('');
        setPassword('');
        setName('');
    };

    return (
        <Dialog open={showLoginModal} onOpenChange={setShowLoginModal} dir="rtl">
            <DialogPopup>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-center">
                            {isLogin ? 'ورود به حساب کاربری' : 'ایجاد حساب کاربری'}
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            {isLogin 
                                ? 'لطفاً اطلاعات ورود خود را وارد کنید' 
                                : 'لطفاً اطلاعات خود را برای ثبت نام وارد کنید'
                            }
                        </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-2">
                                <Label htmlFor="name">نام کامل</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="نام و نام خانوادگی"
                                    required={!isLogin}
                                />
                            </div>
                        )}
                        
                        <div className="space-y-2">
                            <Label htmlFor="email">ایمیل</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="example@example.com"
                                required
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="password">رمز عبور</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="رمز عبور"
                                required
                            />
                        </div>
                        
                        {error && (
                            <div className="text-red-500 text-sm text-center">
                                {error}
                            </div>
                        )}
                        
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading 
                                ? 'در حال پردازش...' 
                                : (isLogin ? 'ورود' : 'ثبت نام')
                            }
                        </Button>
                    </form>
                    
                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            {isLogin 
                                ? 'حساب کاربری ندارید؟ ثبت نام کنید' 
                                : 'قبلاً حساب کاربری دارید؟ وارد شوید'
                            }
                        </button>
                    </div>
                    
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            className="w-full mt-2"
                            onClick={handleClose}
                        >
                            انصراف
                        </Button>
                    </DialogClose>
                </DialogContent>
            </DialogPopup>
        </Dialog>
    );
}