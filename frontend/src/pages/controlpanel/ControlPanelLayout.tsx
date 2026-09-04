import React from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight, Globe, Newspaper, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserMenu } from '@/components/common/UserMenu';
import { cn } from '@/lib/utils';

/** Roles allowed inside /controlpanel at all. */
const isWebsiteStaff = (role: string | undefined) => role === 'admin' || role === 'author';

/**
 * Chrome for the public-website management area (/controlpanel).
 * Separate from the workshop panel (/app): admins manage site settings +
 * blog here, authors manage the blog only. Plain website customers are
 * redirected to their account at /dashboard.
 */
export const ControlPanelLayout: React.FC = () => {
  const { user, isLoading, isAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!isWebsiteStaff(user.role)) return <Navigate to="/dashboard" replace />;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0',
      isActive
        ? 'bg-[#CEAE80] text-black shadow-md font-black'
        : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5'
    );

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0e0e11]">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 dark:border-white/8 bg-white/85 dark:bg-[#16161a]/85 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[#CEAE80]/15 flex items-center justify-center text-[#A67C38] dark:text-[#CEAE80] shrink-0">
              <Globe className="w-4.5 h-4.5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-stone-900 dark:text-white truncate">
                مدیریت وب‌سایت
              </h1>
              <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                تنظیمات ویترین عمومی و وبلاگ پولاریس
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-[#A67C38] dark:hover:text-[#CEAE80] transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">بازگشت به سایت</span>
              <span className="sm:hidden">سایت</span>
            </Link>
            <UserMenu />
          </div>
        </div>

        <nav className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 flex items-center gap-2 overflow-x-auto">
          {isAdmin && (
            <NavLink to="/controlpanel/website" className={navLinkClass}>
              <Globe className="w-3.5 h-3.5" />
              تنظیمات وب‌سایت
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/controlpanel/shop" className={navLinkClass}>
              <ShoppingBag className="w-3.5 h-3.5" />
              مدیریت فروشگاه
            </NavLink>
          )}
          <NavLink to="/controlpanel/blog" className={navLinkClass}>
            <Newspaper className="w-3.5 h-3.5" />
            مدیریت وبلاگ
          </NavLink>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
};

/**
 * /controlpanel index: send each role to its first allowed section.
 * Rendered inside ControlPanelLayout, so guards already ran.
 */
export const ControlPanelIndexRedirect: React.FC = () => {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? '/controlpanel/shop' : '/controlpanel/blog'} replace />;
};

export default ControlPanelLayout;
