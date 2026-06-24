import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');
export const APP_WIDTH = Platform.OS === 'web' ? Math.min(width, 412) : width;
export const APP_HEIGHT = Platform.OS === 'web' ? Math.min(height, 892) : height;

export const COLORS = {
  primaryBg: '#FEF9EA',
  darkGreen: '#1B3B22',
  vibrantYellow: '#F4C73E',
  white: '#FFFFFF',
  black: '#000000',
  textSecondary: '#666666',
  cardBg: '#FFFFFF',
  cardShadow: 'rgba(0, 0, 0, 0.1)',
  success: '#28A745',
  border: '#E0E0E0',
};

export const SIZES = {
  base: 8,
  small: 12,
  font: 14,
  medium: 16,
  large: 18,
  extraLarge: 24,
  padding: 16, // Standard global edge padding
  radius: 16, // Modern soft corner radius used in top apps
};
