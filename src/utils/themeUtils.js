// Helper functions for theme-aware styling

export const getThemeStyles = () => ({
  // Background styles
  bgPrimary: { background: 'var(--bg-primary)' },
  bgSecondary: { background: 'var(--bg-secondary)' },
  bgTertiary: { background: 'var(--bg-tertiary)' },
  bgCard: { background: 'var(--bg-card)' },
  bgHover: { background: 'var(--bg-hover)' },
  bgOverlay: { background: 'var(--bg-overlay)' },
  
  // Text styles
  textPrimary: { color: 'var(--text-primary)' },
  textSecondary: { color: 'var(--text-secondary)' },
  textTertiary: { color: 'var(--text-tertiary)' },
  textMuted: { color: 'var(--text-muted)' },
  
  // Border styles
  borderPrimary: { borderColor: 'var(--border-primary)' },
  borderSecondary: { borderColor: 'var(--border-secondary)' },
  borderTertiary: { borderColor: 'var(--border-tertiary)' },
  
  // Combined styles
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-secondary)',
    boxShadow: 'var(--shadow-card)',
  },
  input: {
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
  },
});

// Theme-aware color generator
export const themeColor = (darkColor, lightColor) => {
  return `var(--theme, ${darkColor})`;
};

// Commonly used composite styles
export const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-secondary)',
  backdropFilter: 'blur(16px)',
  boxShadow: 'var(--shadow-card)',
};

export const overlayStyle = {
  background: 'var(--bg-overlay)',
  backdropFilter: 'blur(24px)',
};

export const inputStyle = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-primary)',
  color: 'var(--text-primary)',
};
