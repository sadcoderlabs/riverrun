import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Subscription state that can be controlled by app lifecycle
 */
export type SubscriptionState = 'active' | 'paused' | 'suspended';

/**
 * Configuration for AppState-based subscription management
 */
interface SubscriptionManagerConfig {
  /**
   * Delay in ms before suspending subscriptions when app goes to background
   * Default: 30000 (30 seconds)
   */
  suspendDelay?: number;

  /**
   * Whether to automatically resume subscriptions when app comes to foreground
   * Default: true
   */
  autoResume?: boolean;
}

/**
 * Hook to manage WebSocket subscriptions based on app lifecycle state
 *
 * This hook helps reduce battery drain and network usage by:
 * - Pausing subscriptions when app goes to background
 * - Suspending (unsubscribing) after extended background time
 * - Resuming subscriptions when app returns to foreground
 *
 * @param config - Configuration options
 * @returns Current subscription state
 *
 * @example
 * ```tsx
 * const subscriptionState = useAppStateSubscriptionManager();
 *
 * useEffect(() => {
 *   if (subscriptionState === 'active') {
 *     // Subscribe to WebSocket
 *     const sub = subscriptionClient.subscribe(...);
 *     return () => sub.unsubscribe();
 *   }
 * }, [subscriptionState]);
 * ```
 */
export function useAppStateSubscriptionManager(
  config: SubscriptionManagerConfig = {},
): SubscriptionState {
  const { suspendDelay = 30000, autoResume = true } = config;

  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>('active');
  const suspendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousAppStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = previousAppStateRef.current;

      // App going to background
      if (previousState === 'active' && nextAppState.match(/inactive|background/)) {
        // Immediately pause subscriptions
        setSubscriptionState('paused');

        // Schedule suspension after delay
        suspendTimeoutRef.current = setTimeout(() => {
          setSubscriptionState('suspended');
        }, suspendDelay);
      }

      // App coming to foreground
      if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        // Cancel any pending suspension
        if (suspendTimeoutRef.current) {
          clearTimeout(suspendTimeoutRef.current);
          suspendTimeoutRef.current = null;
        }

        // Resume subscriptions if auto-resume is enabled
        if (autoResume) {
          setSubscriptionState('active');
        }
      }

      previousAppStateRef.current = nextAppState;
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      if (suspendTimeoutRef.current) {
        clearTimeout(suspendTimeoutRef.current);
      }
      subscription.remove();
    };
  }, [suspendDelay, autoResume]);

  return subscriptionState;
}

/**
 * Hook variant that provides manual control over subscription state
 * Useful when you need to override automatic behavior
 */
export function useAppStateSubscriptionManagerWithControl(config: SubscriptionManagerConfig = {}) {
  const automaticState = useAppStateSubscriptionManager(config);
  const [manualOverride, setManualOverride] = useState<SubscriptionState | null>(null);

  return {
    subscriptionState: manualOverride ?? automaticState,
    setSubscriptionState: setManualOverride,
    clearOverride: () => setManualOverride(null),
    automaticState,
  };
}
