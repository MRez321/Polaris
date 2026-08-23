import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextValue {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('polaris_theme') !== 'light';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.className =
        'bg-[#0A0A0A] text-stone-100 antialiased selection:bg-[#CEAE80]/30 selection:text-white min-h-screen';
      localStorage.setItem('polaris_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.className =
        'bg-[#F8F7F4] text-stone-900 antialiased selection:bg-[#CEAE80]/30 selection:text-black min-h-screen';
      localStorage.setItem('polaris_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
