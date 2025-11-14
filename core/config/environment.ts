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

/**
 * Current app build variant
 */
export const appVariant = getAppVariant();

/**
 * Check if this is a development build
 */
export const isDevelopmentBuild = appVariant === 'development';

/**
 * Check if this is a preview/staging build
 */
export const isPreviewBuild = appVariant === 'preview';

/**
 * Check if this is a production build
 */
export const isProductionBuild = appVariant === 'production';

/**
 * Feature flags based on build variant
 */
export const features = {
  /**
   * Enable debug logging in analytics and error tracking services
   */
  enableDebugLogging: isDevelopmentBuild,

  /**
   * Show developer tools section in settings
   */
  showDeveloperTools: isDevelopmentBuild,
} as const;
