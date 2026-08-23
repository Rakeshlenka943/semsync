import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'default' | 'light' | 'dark' | 'oled' | 'custom';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  customColors?: {
    bg: string;
    surface: string;
    text: string;
    accent: string;
    border: string;
  };
  setCustomColors: (colors: any) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('default');
  const [customColors, setCustomColors] = useState<any>(null);

  // Load saved theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('semsync-theme');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTheme(parsed.theme);
        if (parsed.customColors) setCustomColors(parsed.customColors);
      } catch {}
    }
  }, []);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('semsync-theme', JSON.stringify({ theme, customColors }));
  }, [theme, customColors]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customColors, setCustomColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
