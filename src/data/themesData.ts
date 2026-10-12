import { ThemeOption } from '../types';

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'neon-cyber',
    name: 'Neón Cyberpunk (Predeterminado)',
    icon: '⚡',
    colors: {
      primary: '#00f2fe',
      secondary: '#ff007f',
      background: '#0b0e14',
      cardBg: '#12161f',
      text: '#ffffff',
    },
  },
  {
    id: 'dark-classic',
    name: 'Oscuro Clásico',
    icon: '🌙',
    colors: {
      primary: '#3b82f6',
      secondary: '#10b981',
      background: '#0f172a',
      cardBg: '#1e293b',
      text: '#f8fafc',
    },
  },
  {
    id: 'tactical-blue',
    name: 'Azul Táctico / Fábrica',
    icon: '🛡️',
    colors: {
      primary: '#38bdf8',
      secondary: '#f59e0b',
      background: '#07111e',
      cardBg: '#0f1d30',
      text: '#e2e8f0',
    },
  },
  {
    id: 'light-corporate',
    name: 'Modo Claro Corporativo',
    icon: '☀️',
    colors: {
      primary: '#0284c7',
      secondary: '#e11d48',
      background: '#f8fafc',
      cardBg: '#ffffff',
      text: '#0f172a',
    },
  },
];
