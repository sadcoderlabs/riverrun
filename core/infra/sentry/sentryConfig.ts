/**
 * Sentry Configuration
 *
 * Initializes and configures Sentry for error tracking, performance monitoring,
 * session replay, and breadcrumb tracking.
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

/**
 * Get the current environment
 */
function getEnvironment(): string {
  if (__DEV__) {
    return 'development';
  }

  // Check if this is a preview/staging build
  const releaseChannel = Constants.expoConfig?.extra?.releaseChannel;
  if (releaseChannel === 'staging' || releaseChannel === 'preview') {
    return 'staging';
  }

  return 'production';
}

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

  const environment = getEnvironment();

  Sentry.init({
    // Sentry DSN
    dsn,

    // Environment
    environment,

    // Enable debug mode in development
    debug: __DEV__,

    // Enable performance monitoring
    enableTracing: true,
    tracesSampleRate: environment === 'production' ? 0.2 : 1.0, // 20% in prod, 100% in dev

    // Enable session replay (currently in beta for mobile)
    enableCaptureFailedRequests: true,

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

    // Network breadcrumbs
    enableCaptureFailedRequests: true,

    // Integrations
    integrations: [
      // Navigation tracking
      new Sentry.ReactNavigationInstrumentation(),
    ],

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
      if (breadcrumb.category === 'console' && environment === 'production') {
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

  console.log(`[Sentry] Initialized in ${environment} environment`);
}

/**
 * Get the navigation integration for React Navigation
 *
 * This should be attached to your NavigationContainer's onReady and onStateChange
 * to enable automatic screen tracking.
 *
 * @example
 * ```tsx
 * import { getNavigationIntegration } from '@/core/infra/sentry/sentryConfig';
 *
 * const routingInstrumentation = getNavigationIntegration();
 *
 * <NavigationContainer
 *   ref={navigationRef}
 *   onReady={() => {
 *     routingInstrumentation.registerNavigationContainer(navigationRef);
 *   }}
 * >
 *   {children}
 * </NavigationContainer>
 * ```
 */
export function getNavigationIntegration(): Sentry.ReactNavigationInstrumentation {
  return new Sentry.ReactNavigationInstrumentation();
}
