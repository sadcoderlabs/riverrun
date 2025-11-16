import Constants from 'expo-constants';

/**
 * App build variant type
 */
export type AppVariant = 'development' | 'preview' | 'production';

/**
 * Get the current app build variant from expo config
 * Defaults to 'development' if not set
 */
function getAppVariant(): AppVariant {
  const variant = Constants.expoConfig?.extra?.appVariant;
  if (variant === 'development' || variant === 'preview' || variant === 'production') {
    return variant;
  }
  // Default to development (safer for catching configuration errors)
  return 'development';
}

export const appVariant = getAppVariant();

export const isDevelopmentBuild = appVariant === 'development';
export const isPreviewBuild = appVariant === 'preview';
export const isProductionBuild = appVariant === 'production';

export const features = {
  showDeveloperTools: isDevelopmentBuild,
} as const;
