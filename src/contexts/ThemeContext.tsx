import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemePreset = 'default' | 'light' | 'dark' | 'oled' | 'custom';

export interface CustomColors {
  bg: string;
  surface: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  border: string;
}

interface ThemeContextType {
  theme: ThemePreset;
  setTheme: (theme: ThemePreset) => void;
  customColors: CustomColors | null;
  setCustomColors: (colors: CustomColors) => void;
  applyCustomTheme: (colors: CustomColors) => void;
}

const defaultCustom: CustomColors = {
  bg: '#F5F0E8',
  surface: '#EDE8DF',
  card: '#FFFFFF',
  textPrimary: '#2C2520',
  textSecondary: '#6B5F54',
  accent: '#C97B5A',
  border: '#DCD5C9',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemePreset>('default');
  const [customColors, setCustomColors] = useState<CustomColors | null>(null);

  // Load saved theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('semsync-theme');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTheme(parsed.theme || 'default');
        if (parsed.customColors) setCustomColors(parsed.customColors);
      } catch {}
    }
  }, []);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'custom' && customColors) {
      applyCustomTheme(customColors);
    }
    localStorage.setItem('semsync-theme', JSON.stringify({ theme, customColors }));
  }, [theme, customColors]);

  const applyCustomTheme = (colors: CustomColors) => {
    const root = document.documentElement;
    root.style.setProperty('--bg', colors.bg);
    root.style.setProperty('--surface', colors.surface);
    root.style.setProperty('--card', colors.card);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--border', colors.border);
    root.style.setProperty('--accent-hover', colors.accent);
    root.style.setProperty('--accent-light', colors.accent + '33');
    // For success/warning/danger we keep defaults or could be custom too
  };

  const value = {
    theme,
    setTheme,
    customColors,
    setCustomColors: (colors: CustomColors) => {
      setCustomColors(colors);
      applyCustomTheme(colors);
    },
    applyCustomTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
