/**
 * Segment Configuration
 *
 * Initializes and configures Segment for analytics tracking.
 * Events are sent to Segment, which forwards them to Amplitude and other destinations.
 */

import { appVariant, features } from '@/core/config/environment';
import { createClient } from '@segment/analytics-react-native';
import Constants from 'expo-constants';

/**
 * Segment client instance
 * Used by SegmentAdapter to track events
 */
export let segmentClient: ReturnType<typeof createClient> | undefined = undefined;

/**
 * Initialize Segment
 *
 * This should be called once at app startup, after Sentry initialization.
 * Creates the Segment client instance used by SegmentAdapter.
 */
export function initializeSegment(): void {
  const writeKey = Constants.expoConfig?.extra?.segmentWriteKey;

  if (!writeKey) {
    console.warn('[Segment] No write key provided, Segment will not be initialized');
    return;
  }

  try {
    // Create Segment client
    // Note: Segment automatically captures app info, device info, and screen context
    segmentClient = createClient({
      writeKey,
      trackAppLifecycleEvents: true, // Auto-track Application Opened/Backgrounded/Foregrounded
      debug: features.enableDebugLogging, // Enable debug logging in development builds
    });

    console.log(`[Segment] Initialized in ${appVariant} environment`);
  } catch (error) {
    console.error('[Segment] Failed to initialize:', error);
  }
}

/**
 * Get the Segment client instance
 * Returns undefined if Segment is not initialized
 */
export function getSegmentClient(): ReturnType<typeof createClient> | undefined {
  return segmentClient;
}
