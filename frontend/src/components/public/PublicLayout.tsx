import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

/**
 * Layout for the public marketing site (/, /shop, /services, /contact).
 *
 * Deliberately isolated from the admin AppLayout: no DataContext, no
 * authenticated widgets, no admin navigation — public visitors never load
 * admin code paths or see admin chrome.
 */
export const PublicLayout: React.FC = () => {
  const { pathname } = useLocation();

  // Fresh pages start at the top (React Router keeps scroll on navigation).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden" dir="rtl">
      {/* Ambient gold glow shared by all public pages */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-40 left-1/4 w-[28rem] h-[28rem] bg-[#CEAE80] rounded-full blur-[160px] opacity-[0.13] dark:opacity-[0.10]" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-[#A67C38] rounded-full blur-[150px] opacity-[0.08] dark:opacity-[0.07]" />
      </div>

      <PublicHeader />

      <main className="relative z-10 flex-1">
        <Outlet />
      </main>

      <PublicFooter />
    </div>
  );
};
