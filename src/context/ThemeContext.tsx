'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, THEMES } from '@/lib/themes';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('ziva-theme') as Theme;
    if (savedTheme && THEMES.some(t => t.id === savedTheme)) {
      setThemeState(savedTheme);
      document.documentElement.classList.remove('light', 'fluent', 'cyberpunk');
      if (savedTheme !== 'dark') {
        document.documentElement.classList.add(savedTheme);
      }
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('ziva-theme', newTheme);
    document.documentElement.classList.remove('light', 'fluent', 'cyberpunk');
    if (newTheme !== 'dark') {
      document.documentElement.classList.add(newTheme);
    }
  };

  const toggleTheme = () => {
    const nextIndex = (THEMES.findIndex(t => t.id === theme) + 1) % THEMES.length;
    setTheme(THEMES[nextIndex].id);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
