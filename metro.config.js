// Use Sentry's Metro config to ensure unique Debug IDs for bundles and source maps
// This enables better error tracking and source map mapping in Sentry
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// Enable package exports for select libraries
const resolveRequestWithPackageExports = (context, moduleName, platform) => {
  // Package exports in `jose` are incompatible, so the browser version is used
  // https://docs.privy.io/basics/react-native/installation#enabling-package-exports
  if (moduleName === 'jose') {
    const ctx = {
      ...context,
      unstable_conditionNames: ['browser'],
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.resolveRequest = resolveRequestWithPackageExports;

module.exports = config;
