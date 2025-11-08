import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * App lifecycle state
 */
export type AppLifecycleState = 'active' | 'paused' | 'suspended';

/**
 * Configuration for app lifecycle management
 */
export interface AppLifecycleConfig {
  /**
   * Delay in ms before suspending when app goes to background
   * Default: 30000 (30 seconds)
   */
  suspendDelay?: number;

  /**
   * Whether to automatically resume when app comes to foreground
   * Default: true
   */
  autoResume?: boolean;
}

/**
 * Hook to track app lifecycle state (active/paused/suspended)
 *
 * Returns the current lifecycle state which helps optimize resource usage:
 * - **active**: App in foreground, normal operation
 * - **paused**: App just went to background, resources maintained for quick resume
 * - **suspended**: App in background >30s, resources released to save battery/data
 *
 * @param config - Configuration options
 * @returns Current app lifecycle state
 *
 * @example
 * ```tsx
 * const appState = useAppLifecycle();
 *
 * useEffect(() => {
 *   if (appState === 'active') {
 *     // Subscribe to real-time data
 *     const sub = subscriptionClient.subscribe(...);
 *     return () => sub.unsubscribe();
 *   }
 * }, [appState]);
 * ```
 */
export function useAppLifecycle(config: AppLifecycleConfig = {}): AppLifecycleState {
  const { suspendDelay = 30000, autoResume = true } = config;

  const [appState, setAppState] = useState<AppLifecycleState>('active');
  const suspendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousAppStateRef = useRef<AppStateStatus>(AppState.currentState);
  const resumeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = previousAppStateRef.current;

      // App going to background
      if (previousState === 'active' && nextAppState.match(/inactive|background/)) {
        // Cancel any pending resume (important for iOS Face ID lock screen flicker)
        // iOS often sends: inactive → active (Face ID) → inactive → background
        if (resumeDebounceRef.current) {
          clearTimeout(resumeDebounceRef.current);
          resumeDebounceRef.current = null;
        }

        // Immediately pause (no debounce - we want to save battery ASAP)
        setAppState('paused');

        // Schedule suspension after delay
        suspendTimeoutRef.current = setTimeout(() => {
          setAppState('suspended');
        }, suspendDelay);
      }

      // App coming to foreground
      if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        // Cancel any pending suspension
        if (suspendTimeoutRef.current) {
          clearTimeout(suspendTimeoutRef.current);
          suspendTimeoutRef.current = null;
        }

        // Debounce resume to avoid iOS Face ID lock screen flicker
        // iOS sends: inactive → active (brief Face ID unlock) → inactive → background
        // We only resume if app stays active for 200ms
        if (resumeDebounceRef.current) {
          clearTimeout(resumeDebounceRef.current);
        }

        resumeDebounceRef.current = setTimeout(() => {
          // Resume if auto-resume is enabled
          if (autoResume) {
            setAppState('active');
          }
          resumeDebounceRef.current = null;
        }, 200); // 200ms debounce - fast enough for users, slow enough to filter Face ID flicker
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
      if (resumeDebounceRef.current) {
        clearTimeout(resumeDebounceRef.current);
      }
      subscription.remove();
    };
  }, [suspendDelay, autoResume]);

  return appState;
}

/**
 * Hook variant that provides manual control over app lifecycle state
 * Useful when you need to override automatic behavior
 */
export function useAppLifecycleWithControl(config: AppLifecycleConfig = {}) {
  const automaticState = useAppLifecycle(config);
  const [manualOverride, setManualOverride] = useState<AppLifecycleState | null>(null);

  return {
    appState: manualOverride ?? automaticState,
    setAppState: setManualOverride,
    clearOverride: () => setManualOverride(null),
    automaticState,
  };
}
