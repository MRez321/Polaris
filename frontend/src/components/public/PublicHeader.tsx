import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, LogIn, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import logoUrl from '@/assets/logo.png';

const NAV_LINKS = [
  { to: '/', label: 'خانه', end: true },
  { to: '/shop', label: 'فروشگاه' },
  { to: '/services', label: 'خدمات دوخت' },
  { to: '/contact', label: 'تماس با ما' },
];

/**
 * Public marketing header — sticky, glassy, gold-accented.
 * Fully independent from the admin Header component.
 */
export const PublicHeader: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Close the mobile menu on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Add a shadow once the page scrolls behind the sticky bar.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b transition-all duration-300',
        'bg-[#F8F7F4]/85 dark:bg-[#0A0A0A]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#F8F7F4]/70 dark:supports-[backdrop-filter]:bg-[#0A0A0A]/65',
        scrolled
          ? 'border-[#CEAE80]/25 shadow-lg shadow-black/5 dark:shadow-black/30'
          : 'border-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 sm:h-[4.5rem] flex items-center justify-between gap-3">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group" aria-label="پولاریس استایل">
            <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden ring-2 ring-[#CEAE80]/35 group-hover:ring-[#CEAE80]/70 transition-all shadow-md bg-white dark:bg-[#16161a]">
              <img src={logoUrl} alt="لوگوی پولاریس استایل" className="w-full h-full object-cover" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-base sm:text-lg font-black text-stone-900 dark:text-white">
                پولاریس <span className="text-[#A67C38] dark:text-[#CEAE80]">استایل</span>
              </span>
              <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 tracking-wide">
                دوخت شخصی و پوشاک آماده
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="منوی اصلی">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'relative px-3.5 py-2 rounded-xl text-sm font-bold transition-colors',
                    isActive
                      ? 'text-[#A67C38] dark:text-[#CEAE80] bg-[#CEAE80]/12 dark:bg-[#CEAE80]/10'
                      : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 border border-transparent hover:border-[#CEAE80]/30 transition-all active:scale-95"
              title={isDarkMode ? 'حالت روشن' : 'حالت تیره'}
              aria-label={isDarkMode ? 'تغییر به حالت روشن' : 'تغییر به حالت تیره'}
            >
              {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="hidden xs:flex sm:flex items-center gap-1.5 h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-[#CEAE80] hover:bg-[#c2a06e] text-black text-xs sm:text-sm font-black shadow-md shadow-[#CEAE80]/25 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              ورود
            </button>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors active:scale-95"
              aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden border-t border-[#CEAE80]/15 bg-[#F8F7F4]/95 dark:bg-[#0A0A0A]/95 backdrop-blur-xl"
          >
            <nav className="max-w-7xl mx-auto px-4 py-4 space-y-1.5" aria-label="منوی موبایل">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.05, duration: 0.25 }}
                >
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      cn(
                        'block px-4 py-3 rounded-xl text-sm font-bold transition-colors',
                        isActive
                          ? 'bg-[#CEAE80]/15 text-[#A67C38] dark:text-[#CEAE80]'
                          : 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/5'
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.25 }}
                className="pt-2"
              >
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#CEAE80] hover:bg-[#c2a06e] text-black text-sm font-black shadow-md shadow-[#CEAE80]/25 transition-all active:scale-[0.98]"
                >
                  <LogIn className="w-4 h-4" />
                  ورود به حساب کاربری
                </button>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
