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

// Read saved theme from localStorage before the component mounts
const savedTheme = localStorage.getItem('semsync-theme');
let initialTheme: ThemePreset = 'default';
let initialCustomColors: CustomColors | null = null;
if (savedTheme) {
  try {
    const parsed = JSON.parse(savedTheme);
    initialTheme = parsed.theme || 'default';
    initialCustomColors = parsed.customColors || null;
  } catch {}
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemePreset>(initialTheme);
  const [customColors, setCustomColors] = useState<CustomColors | null>(initialCustomColors);

  // Apply theme whenever it changes
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'custom' && customColors) {
      applyCustomTheme(customColors);
    }
    // Persist to localStorage
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
  };

  const value = {
    theme,
    setTheme,
    customColors,
    setCustomColors: (colors: CustomColors) => {
      setCustomColors(colors);
      // The useEffect will apply it automatically
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
