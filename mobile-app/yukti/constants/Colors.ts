// src/constants/colors.ts

// Primary brand colors from Yukti design
const brandGreen = '#5FB574';  // Main green from logo
const brandGreenDark = '#4A9460';  // Darker shade
const brandGreenLight = '#7BC88F';  // Lighter shade

// Accent colors
const tintColorLight = '#5FB574';  // Green for light mode
const tintColorDark = '#7BC88F';   // Lighter green for dark mode

// Status colors
const successGreen = '#34A853';    // Google green
const warningOrange = '#FF9800';
const errorRed = '#F44336';
const infoBlue = '#2196F3';

// Neutral colors
const neutralLight = {
  background: '#F5F5F5',        // Light gray background
  card: '#FFFFFF',              // White cards
  border: '#E0E0E0',            // Light borders
  divider: '#EEEEEE',           // Dividers
  overlay: 'rgba(0,0,0,0.5)',   // Modal overlay
};

const neutralDark = {
  background: '#1A1A1A',        // Dark background (from Yukti)
  backgroundDeep: '#0A0A0A',    // Deeper black
  card: '#2A2A2A',              // Dark cards
  cardLight: '#333333',         // Lighter dark cards
  border: '#3A3A3A',            // Dark borders
  divider: '#2A2A2A',           // Dark dividers
  overlay: 'rgba(0,0,0,0.8)',   // Dark modal overlay
};

// Text colors
const textLight = {
  primary: '#000000',           // Black text
  secondary: '#666666',         // Gray text
  tertiary: '#999999',          // Light gray text
  disabled: '#CCCCCC',          // Disabled text
  inverse: '#FFFFFF',           // White text on dark backgrounds
};

const textDark = {
  primary: '#FFFFFF',           // White text
  secondary: '#CCCCCC',         // Light gray text
  tertiary: '#999999',          // Medium gray text
  disabled: '#666666',          // Disabled text
  inverse: '#000000',           // Black text on light backgrounds
};

// Gradient colors (from Yukti buttons)
const gradients = {
  greenButton: ['#34A853', '#2E7D32'],           // Google green gradient
  githubButton: ['#333333', '#1a1a1a'],          // GitHub dark gradient
  primaryButton: ['#e0f7fa', '#b2ebf2'],         // Light cyan gradient
  card: ['#1a1a1a', '#000000'],                  // Dark gradient
  success: ['#4CAF50', '#2E7D32'],               // Success gradient
  warning: ['#FFB300', '#F57C00'],               // Warning gradient
  error: ['#F44336', '#C62828'],                 // Error gradient
};

// Shadow colors
const shadows = {
  light: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  brand: {
    green: {
      shadowColor: brandGreen,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};

// Export color scheme
export default {
  // Light mode (following your structure)
  light: {
    text: textLight.primary,
    textSecondary: textLight.secondary,
    textTertiary: textLight.tertiary,
    background: neutralLight.background,
    backgroundCard: neutralLight.card,
    tint: tintColorLight,
    border: neutralLight.border,
    divider: neutralLight.divider,
    tabIconDefault: '#CCCCCC',
    tabIconSelected: tintColorLight,
    success: successGreen,
    warning: warningOrange,
    error: errorRed,
    info: infoBlue,
  },
  
  // Dark mode (following your structure)
  dark: {
    text: textDark.primary,
    textSecondary: textDark.secondary,
    textTertiary: textDark.tertiary,
    background: neutralDark.backgroundDeep,
    backgroundCard: neutralDark.card,
    tint: tintColorDark,
    border: neutralDark.border,
    divider: neutralDark.divider,
    tabIconDefault: '#666666',
    tabIconSelected: tintColorDark,
    success: successGreen,
    warning: warningOrange,
    error: errorRed,
    info: infoBlue,
  },

  // Brand colors (mode-independent)
  brand: {
    primary: brandGreen,
    primaryDark: brandGreenDark,
    primaryLight: brandGreenLight,
  },

  // Gradients
  gradients,

  // Shadows
  shadows,

  // Status colors
  status: {
    success: successGreen,
    warning: warningOrange,
    error: errorRed,
    info: infoBlue,
    pending: warningOrange,
    completed: successGreen,
    failed: errorRed,
  },

  // Opacity variations
  opacity: {
    light: {
      10: 'rgba(0, 0, 0, 0.1)',
      20: 'rgba(0, 0, 0, 0.2)',
      30: 'rgba(0, 0, 0, 0.3)',
      50: 'rgba(0, 0, 0, 0.5)',
      70: 'rgba(0, 0, 0, 0.7)',
    },
    dark: {
      10: 'rgba(255, 255, 255, 0.1)',
      20: 'rgba(255, 255, 255, 0.2)',
      30: 'rgba(255, 255, 255, 0.3)',
      50: 'rgba(255, 255, 255, 0.5)',
      70: 'rgba(255, 255, 255, 0.7)',
    },
    green: {
      10: 'rgba(95, 181, 116, 0.1)',
      20: 'rgba(95, 181, 116, 0.2)',
      30: 'rgba(95, 181, 116, 0.3)',
    },
  },
};

// Helper function to get colors based on theme
export const getColors = (isDark: boolean) => {
  return isDark ? {
    ...colors.dark,
    brand: colors.brand,
    gradients: colors.gradients,
    shadows: colors.shadows,
    status: colors.status,
    opacity: colors.opacity.dark,
  } : {
    ...colors.light,
    brand: colors.brand,
    gradients: colors.gradients,
    shadows: colors.shadows,
    status: colors.status,
    opacity: colors.opacity.light,
  };
};

// Named exports for direct access
export const colors = {
  light: {
    text: textLight.primary,
    textSecondary: textLight.secondary,
    textTertiary: textLight.tertiary,
    background: neutralLight.background,
    backgroundCard: neutralLight.card,
    tint: tintColorLight,
    border: neutralLight.border,
    divider: neutralLight.divider,
    tabIconDefault: '#CCCCCC',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: textDark.primary,
    textSecondary: textDark.secondary,
    textTertiary: textDark.tertiary,
    background: neutralDark.backgroundDeep,
    backgroundCard: neutralDark.card,
    tint: tintColorDark,
    border: neutralDark.border,
    divider: neutralDark.divider,
    tabIconDefault: '#666666',
    tabIconSelected: tintColorDark,
  },
  brand: {
    primary: brandGreen,
    primaryDark: brandGreenDark,
    primaryLight: brandGreenLight,
  },
  gradients,
  shadows,
  status: {
    success: successGreen,
    warning: warningOrange,
    error: errorRed,
    info: infoBlue,
    pending: warningOrange,
    completed: successGreen,
    failed: errorRed,
  },
  opacity: {
    light: {
      10: 'rgba(0, 0, 0, 0.1)',
      20: 'rgba(0, 0, 0, 0.2)',
      30: 'rgba(0, 0, 0, 0.3)',
      50: 'rgba(0, 0, 0, 0.5)',
      70: 'rgba(0, 0, 0, 0.7)',
    },
    dark: {
      10: 'rgba(255, 255, 255, 0.1)',
      20: 'rgba(255, 255, 255, 0.2)',
      30: 'rgba(255, 255, 255, 0.3)',
      50: 'rgba(255, 255, 255, 0.5)',
      70: 'rgba(255, 255, 255, 0.7)',
    },
    green: {
      10: 'rgba(95, 181, 116, 0.1)',
      20: 'rgba(95, 181, 116, 0.2)',
      30: 'rgba(95, 181, 116, 0.3)',
    },
  },
};