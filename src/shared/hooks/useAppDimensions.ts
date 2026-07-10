import { useWindowDimensions, Platform } from 'react-native';

const MOBILE_WIDTH = 412;
const MOBILE_HEIGHT = 892;

export function useAppDimensions() {
  const windowDims = useWindowDimensions();
  
  if (Platform.OS !== 'web') {
    return windowDims;
  }

  const isLargeScreen = windowDims.width > 450;
  
  if (isLargeScreen) {
    return {
      width: MOBILE_WIDTH,
      height: MOBILE_HEIGHT,
      scale: windowDims.scale,
      fontScale: windowDims.fontScale,
    };
  }

  return windowDims;
}
