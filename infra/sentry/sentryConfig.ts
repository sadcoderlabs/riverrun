/**
 * Sentry Configuration
 *
 * Initializes and configures Sentry for error tracking, performance monitoring,
 * session replay, and breadcrumb tracking.
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { appVariant, isDevelopmentBuild } from '@/config/environment';

/**
 * Initialize Sentry
 *
 * This should be called once at app startup, before any other code runs.
 */
export function initializeSentry(): void {
  // Get DSN from environment config
  const dsn = Constants.expoConfig?.extra?.sentryDsn || process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn('[Sentry] No DSN provided, Sentry will not be initialized');
    return;
  }

  Sentry.init({
    // Sentry DSN
    dsn,

    // Environment
    environment: appVariant,

    // Enable debug mode in development builds
    debug: isDevelopmentBuild,

    // Performance monitoring
    tracesSampleRate: appVariant === 'production' ? 0.2 : 1.0, // 20% in prod, 100% in dev

    // Breadcrumbs configuration
    maxBreadcrumbs: 100,
    attachStacktrace: true,

    // Enable automatic session tracking
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000, // 30 seconds

    // Enable native crash reporting
    enableNative: true,
    enableNativeCrashHandling: true,

    // Enable automatic performance instrumentation
    enableAutoPerformanceTracing: true,

    // Network request capture
    enableCaptureFailedRequests: true,

    // Before send hook - filter out sensitive data
    beforeSend(event) {
      // Filter out any wallet private keys or sensitive data
      if (event.extra) {
        // Remove any keys that might contain sensitive data
        const sensitiveKeys = ['privateKey', 'mnemonic', 'seed', 'password', 'secret'];
        for (const key of sensitiveKeys) {
          if (key in event.extra) {
            delete event.extra[key];
          }
        }
      }

      return event;
    },

    // Before breadcrumb hook - filter sensitive breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Don't track console.log in production
      if (breadcrumb.category === 'console' && appVariant === 'production') {
        return null;
      }

      return breadcrumb;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Ignore user cancellations
      /user.*cancel/i,
      /cancelled/i,
      // Ignore network errors that are expected
      /network request failed/i,
      /timeout/i,
    ],
  });

  // Set global tags
  Sentry.setTag('platform', Constants.platform?.ios ? 'ios' : 'android');
  Sentry.setTag('app_version', Constants.expoConfig?.version || 'unknown');

  console.log(`[Sentry] Initialized in ${appVariant} environment`);
}

/**
 * Navigation tracking
 *
 * Note: React Navigation integration in Sentry SDK 7.x requires manual setup.
 * For automatic screen tracking, consider using the navigation breadcrumb utility
 * in your navigation listeners.
 *
 * @example
 * ```tsx
 * import { useTelemetry, createNavigationBreadcrumb } from '@/app-internal';
 *
 * const { addBreadcrumb } = useTelemetry();
 *
 * <NavigationContainer
 *   onStateChange={(state) => {
 *     const currentRoute = getCurrentRoute(state);
 *     addBreadcrumb(createNavigationBreadcrumb(currentRoute.name, currentRoute.params));
 *   }}
 * >
 *   {children}
 * </NavigationContainer>
 * ```
 */
