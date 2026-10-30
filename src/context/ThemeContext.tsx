'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, THEMES, LEGACY_THEME_CLASSES } from '@/lib/themes';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyTheme(theme: Theme) {
  document.documentElement.classList.remove(...LEGACY_THEME_CLASSES);
  if (theme !== 'dark') {
    document.documentElement.classList.add(theme);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('ziva-theme') as Theme;
    // Kaldırılan temalar (fluent, cyberpunk) kayıtlıysa koyu temaya dön
    const valid = THEMES.some(t => t.id === savedTheme) ? savedTheme : 'dark';
    setThemeState(valid);
    applyTheme(valid);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('ziva-theme', newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
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
