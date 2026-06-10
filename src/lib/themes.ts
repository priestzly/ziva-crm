import { Sun, Moon, Palette, Zap } from 'lucide-react';

export type Theme = 'dark' | 'light' | 'fluent' | 'cyberpunk';

export interface ThemeConfig {
  id: Theme;
  name: string;
  fontFamily: string;
  icon: any;
  description: string;
  accentColor: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'dark',
    name: 'AMOLED Dark',
    fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    icon: Sun,
    description: 'Zifiri siyah OLED ekran tasarımı',
    accentColor: '#ef4444',
  },
  {
    id: 'light',
    name: 'Minimal Light',
    fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    icon: Moon,
    description: 'Temiz ve sade beyaz tasarım',
    accentColor: '#ef4444',
  },
  {
    id: 'fluent',
    name: 'Windows 11 Fluent',
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
    icon: Palette,
    description: 'Windows 11 Mica / Fluent stili',
    accentColor: '#0078d4',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    fontFamily: '"Outfit", system-ui, -apple-system, sans-serif',
    icon: Zap,
    description: 'Neon renkli fütüristik tasarım',
    accentColor: '#ff007f',
  }
];
