/**
 * useScreenTracking Hook
 *
 * Automatically tracks screen views when a screen comes into focus.
 * Uses React Navigation's useFocusEffect to detect screen focus.
 *
 * @example
 * ```tsx
 * import { useScreenTracking } from '@/app-internal';
 *
 * export default function HomeScreen() {
 *   useScreenTracking('Home');
 *
 *   return <View>...</View>;
 * }
 * ```
 */

import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

import { useContainer } from '../../../di';
import type { ScreenName, ScreenProps } from '../../../../contexts/telemetry/ports/types';

/**
 * Track screen views automatically when the screen is focused
 *
 * This hook should be called at the top level of each screen component.
 * It will automatically track a screen view when the screen comes into focus.
 *
 * @param screenName - The name of the screen (must be a valid ScreenName)
 * @param props - Optional screen properties (type-safe based on screenName)
 *
 * @example
 * ```tsx
 * // Basic usage
 * function HomeScreen() {
 *   useScreenTracking('Home');
 *   return <View>...</View>;
 * }
 *
 * // With properties
 * function TradeScreen() {
 *   const { coin } = useLocalSearchParams();
 *   useScreenTracking('Trade', { market: coin, tab: 'positions' });
 *   return <View>...</View>;
 * }
 *
 * // Chart screen with required market
 * function ChartScreen() {
 *   const { coin } = useLocalSearchParams();
 *   useScreenTracking('Chart', { market: coin as string });
 *   return <View>...</View>;
 * }
 * ```
 */
export function useScreenTracking<S extends ScreenName>(
  screenName: S,
  props?: ScreenProps[S],
): void {
  const telemetryService = useContainer(c => c.telemetryService);

  useFocusEffect(
    useCallback(() => {
      // Track screen view when screen is focused
      void telemetryService.trackScreen(screenName, props as ScreenProps[S]);
    }, [telemetryService, screenName, props]),
  );
}
