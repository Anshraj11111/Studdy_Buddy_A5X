import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // 'dark' or 'light'
      isInitialized: false,
      
      initTheme: () => {
        const { theme } = get();
        document.documentElement.setAttribute('data-theme', theme);
        set({ isInitialized: true });
      },
      
      toggleTheme: () => {
        set((state) => {
          const newTheme = state.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', newTheme);
          return { theme: newTheme };
        });
      },
      
      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);

export default useThemeStore;
export { useThemeStore };

// Theme colors configuration
export const themes = {
  dark: {
    // Backgrounds
    bg: {
      primary: '#0a0814',
      secondary: '#0f0c1f',
      tertiary: 'rgba(10,8,30,0.75)',
      card: 'rgba(10,8,30,0.9)',
      hover: 'rgba(99,102,241,0.06)',
      overlay: 'rgba(5,3,20,0.82)',
    },
    // Text colors
    text: {
      primary: '#ffffff',
      secondary: 'rgba(148,163,184,0.7)',
      tertiary: 'rgba(148,163,184,0.5)',
      muted: 'rgba(148,163,184,0.4)',
    },
    // Border colors
    border: {
      primary: 'rgba(99,102,241,0.2)',
      secondary: 'rgba(99,102,241,0.15)',
      tertiary: 'rgba(99,102,241,0.1)',
    },
    // Accent colors (stays same for both themes)
    accent: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      glow: 'rgba(99,102,241,0.4)',
    },
    // Status colors
    success: '#34d399',
    error: '#ef4444',
    warning: '#fbbf24',
    info: '#60a5fa',
  },
  light: {
    // Backgrounds
    bg: {
      primary: '#f8fafc',
      secondary: '#ffffff',
      tertiary: 'rgba(248,250,252,0.95)',
      card: '#ffffff',
      hover: 'rgba(99,102,241,0.04)',
      overlay: 'rgba(248,250,252,0.95)',
    },
    // Text colors
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#64748b',
      muted: '#94a3b8',
    },
    // Border colors
    border: {
      primary: 'rgba(99,102,241,0.2)',
      secondary: 'rgba(226,232,240,0.8)',
      tertiary: 'rgba(226,232,240,0.6)',
    },
    // Accent colors (stays same for both themes)
    accent: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      glow: 'rgba(99,102,241,0.3)',
    },
    // Status colors
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
};

// Helper hook to get current theme colors
export const useThemeColors = () => {
  const { theme } = useThemeStore();
  return themes[theme];
};
