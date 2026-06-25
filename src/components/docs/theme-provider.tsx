'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const ThemeCtx = createContext<{
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: 'dark', resolvedTheme: 'dark', setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeCtx);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const setTheme = (t: Theme) => setThemeState(t);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeCtx.Provider value={{ theme, resolvedTheme: theme, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}
