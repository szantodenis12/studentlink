import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (event?: React.MouseEvent | MouseEvent) => void;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage or system preference
    const saved = localStorage.getItem('studentlink-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('studentlink-theme', theme);
  }, [theme]);

  const toggleTheme = (event?: React.MouseEvent | MouseEvent) => {
    if (!document.startViewTransition) {
      setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
      return;
    }

    if (event) {
      const x = 'clientX' in event ? event.clientX : 0;
      const y = 'clientY' in event ? event.clientY : 0;
      const root = document.documentElement;
      root.style.setProperty('--x', `${x}px`);
      root.style.setProperty('--y', `${y}px`);
    }

    document.startViewTransition(() => {
      setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    });
  };

  const isDarkMode = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
