import { Sun, Moon } from 'lucide-react';

export type Theme = 'dark' | 'light';

export interface ThemeConfig {
  id: Theme;
  name: string;
  icon: any;
  description: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'dark',
    name: 'Koyu',
    icon: Moon,
    description: 'Ziva kırmızısı ile koyu tema',
  },
  {
    id: 'light',
    name: 'Açık',
    icon: Sun,
    description: 'Temiz ve sade açık tema',
  },
];

// Eski sürümlerden kalan tema sınıfları; kaydedilmiş tercihler temizlenirken kaldırılır
export const LEGACY_THEME_CLASSES = ['light', 'fluent', 'cyberpunk'];
