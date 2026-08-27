import React, { useState, useEffect } from 'react';
import type { ThemePreset, CustomColors } from '../contexts/ThemeContext';
import { useTheme } from '../contexts/ThemeContext';
import { ArrowLeft, Check, Palette, Moon, Sun, Monitor, Paintbrush } from 'lucide-react';

interface ThemeForgeProps {
  onBack: () => void;
}

const PRESETS: { id: ThemePreset; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'default', label: 'Default', icon: <Palette size={20} />, description: 'Nature & calm' },
  { id: 'light', label: 'Light', icon: <Sun size={20} />, description: 'Bright, clean, energetic' },
  { id: 'dark', label: 'Dark', icon: <Moon size={20} />, description: 'Warm, low blue light' },
  { id: 'oled', label: 'OLED Black', icon: <Monitor size={20} />, description: 'True black, saves battery' },
  { id: 'custom', label: 'Custom', icon: <Paintbrush size={20} />, description: 'Your own colours' },
];

const DEFAULT_CUSTOM: CustomColors = {
  bg: '#F5F0E8',
  surface: '#EDE8DF',
  card: '#FFFFFF',
  textPrimary: '#2C2520',
  textSecondary: '#6B5F54',
  accent: '#C97B5A',
  border: '#DCD5C9',
};

export const ThemeForge: React.FC<ThemeForgeProps> = ({ onBack }) => {
  const { theme, setTheme, customColors, setCustomColors } = useTheme();
  const [localCustom, setLocalCustom] = useState<CustomColors>(customColors || DEFAULT_CUSTOM);

  const applyPreset = (preset: ThemePreset) => setTheme(preset);
  const applyCustom = () => { setCustomColors(localCustom); setTheme('custom'); };
  const resetCustom = () => { setLocalCustom(DEFAULT_CUSTOM); setCustomColors(DEFAULT_CUSTOM); setTheme('default'); };

  return (
    <div className="p-4 max-w-4xl mx-auto pb-24" style={{ backgroundColor: 'var(--bg)', minHeight: '100vh' }}>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 rounded hover:bg-opacity-10" style={{ color: 'var(--text-primary)' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>🎨 Theme Forge</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {PRESETS.map((preset) => {
          const isActive = theme === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className="p-4 rounded-lg border-2 transition-all text-left"
              style={{
                backgroundColor: isActive ? 'var(--accent-light)' : 'var(--card)',
                borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                color: isActive ? 'var(--accent)' : 'var(--text-primary)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                {preset.icon}
                <span className="font-medium">{preset.label}</span>
                {isActive && <Check size={16} style={{ color: 'var(--accent)' }} />}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{preset.description}</div>
            </button>
          );
        })}
      </div>

      {theme === 'custom' && (
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>🎨 Custom Colours</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'bg', label: 'Background', value: localCustom.bg },
              { key: 'surface', label: 'Surface', value: localCustom.surface },
              { key: 'card', label: 'Card', value: localCustom.card },
              { key: 'textPrimary', label: 'Primary Text', value: localCustom.textPrimary },
              { key: 'textSecondary', label: 'Secondary Text', value: localCustom.textSecondary },
              { key: 'accent', label: 'Accent', value: localCustom.accent },
              { key: 'border', label: 'Border', value: localCustom.border },
            ].map((field) => (
              <div key={field.key} className="flex flex-col gap-1">
                <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>{field.label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={field.value}
                    onChange={(e) => setLocalCustom({ ...localCustom, [field.key]: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer" style={{ borderColor: 'var(--border)' }}
                  />
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => setLocalCustom({ ...localCustom, [field.key]: e.target.value })}
                    className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--bg)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={applyCustom} className="px-4 py-2 rounded text-sm font-medium" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Apply Custom Theme</button>
            <button onClick={resetCustom} className="px-4 py-2 rounded text-sm font-medium" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Reset to Default</button>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>👁️ Live Preview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>Background</div>
          <div className="p-3 rounded" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>Surface</div>
          <div className="p-3 rounded" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>Card</div>
          <div className="p-3 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>Accent</div>
        </div>
      </div>
    </div>
  );
};
