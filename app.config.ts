import { ExpoConfig, ConfigContext } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getUniqueIdentifier = (): string => {
  if (IS_DEV) {
    return 'com.perpetualprotocol.riverrun.dev';
  }

  if (IS_PREVIEW) {
    return 'com.perpetualprotocol.riverrun.preview';
  }

  return 'com.perpetualprotocol.riverrun';
};

const getAppName = (): string => {
  if (IS_DEV) {
    return 'PERP GO (Dev)';
  }

  if (IS_PREVIEW) {
    return 'PERP GO (Preview)';
  }

  return 'PERP GO';
};

export default ({ config }: ConfigContext): ExpoConfig => {
  if (!config.slug) {
    throw new Error('slug is required in app.json');
  }

  return {
    ...config,
    slug: config.slug,
    // Dynamic app name based on variant
    name: getAppName(),
    // Dynamic bundle identifiers for iOS and Android
    ios: {
      ...config.ios,
      bundleIdentifier: getUniqueIdentifier(),
    },
    android: {
      ...config.android,
      package: getUniqueIdentifier(),
    },
    // Pass app variant to runtime
    extra: {
      ...config.extra,
      appVariant: process.env.APP_VARIANT || 'development',
      // Segment write key - set via environment variable for each build profile
      segmentWriteKey: process.env.SEGMENT_WRITE_KEY,
    },
  };
};
