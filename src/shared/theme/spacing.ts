import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');
export const APP_WIDTH = Platform.OS === 'web' ? Math.min(width, 412) : width;
export const APP_HEIGHT = Platform.OS === 'web' ? Math.min(height, 892) : height;

export const SIZES = {
  base: 8,
  small: 12,
  font: 14,
  medium: 16,
  large: 18,
  extraLarge: 24,
  padding: 16,
  radius: 16,
};
