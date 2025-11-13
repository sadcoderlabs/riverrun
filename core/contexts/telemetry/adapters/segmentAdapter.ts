/**
 * Segment Adapter
 *
 * Wraps the Segment SDK with a clean interface for analytics tracking.
 * Implements analytics methods for the telemetry service.
 */

import type { JsonMap } from '@segment/analytics-react-native';

import { getSegmentClient } from '../../../infra/segment/segmentConfig';
import type {
  ScreenName,
  ScreenProps,
  TelemetryEventName,
  TelemetryEventProps,
  TelemetryUser,
} from '../ports/types';

/**
 * Segment adapter for analytics tracking
 */
export class SegmentAdapter {
  /**
   * Identify user in Segment
   * Maps to analytics.identify() in Segment
   */
  identify(user: TelemetryUser): void {
    const client = getSegmentClient();
    if (!client) {
      console.warn('[Segment] Client not initialized, skipping identify');
      return;
    }

    try {
      client.identify(user.address, {
        walletSource: user.walletSource,
      });
    } catch (error) {
      console.error('[Segment] Failed to identify user:', error);
    }
  }

  /**
   * Reset user identification in Segment
   * Clears the current user and generates a new anonymous ID
   * Maps to analytics.reset() in Segment
   */
  reset(): void {
    const client = getSegmentClient();
    if (!client) {
      console.warn('[Segment] Client not initialized, skipping reset');
      return;
    }

    try {
      client.reset();
    } catch (error) {
      console.error('[Segment] Failed to reset user:', error);
    }
  }

  /**
   * Track an analytics event in Segment
   * All events are forwarded to downstream destinations (Amplitude, etc.)
   * Maps to analytics.track() in Segment
   *
   * @param event Event name (type-safe union)
   * @param props Event properties (type-safe per event)
   */
  track<E extends TelemetryEventName>(event: E, props: TelemetryEventProps[E]): void {
    const client = getSegmentClient();
    if (!client) {
      console.warn('[Segment] Client not initialized, skipping track');
      return;
    }

    try {
      // Handle events with undefined props (like app_opened)
      const properties = props === undefined ? {} : (props as JsonMap);

      client.track(event, properties);
    } catch (error) {
      console.error('[Segment] Failed to track event:', error);
    }
  }

  /**
   * Track a screen view in Segment
   * Screen views help understand user navigation patterns
   * Maps to analytics.screen() in Segment
   *
   * @param screenName Screen name (type-safe union)
   * @param props Screen properties (type-safe per screen)
   */
  screen<S extends ScreenName>(screenName: S, props: ScreenProps[S]): void {
    const client = getSegmentClient();
    if (!client) {
      console.warn('[Segment] Client not initialized, skipping screen');
      return;
    }

    try {
      // Handle screens with undefined props
      const properties = props === undefined ? {} : (props as JsonMap);

      client.screen(screenName, properties);
    } catch (error) {
      console.error('[Segment] Failed to track screen:', error);
    }
  }
}
