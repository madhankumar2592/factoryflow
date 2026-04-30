export const theme = {
  colors: {
    primary: '#000000',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceSecondary: '#EBEBEB',
    border: '#D1D1D1',
    textPrimary: '#000000',
    textSecondary: '#6E6E73',
    textTertiary: '#AEAEB2',
    success: '#34C759',
    danger: '#FF3B30',
    warning: '#FF9500',
  },
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  },
  radius: {
    sm: 8, md: 12, lg: 16, xl: 20,
  },
  fontSize: {
    xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28, hero: 36,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};
