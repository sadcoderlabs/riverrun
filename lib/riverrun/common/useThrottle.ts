import { useCallback, useEffect, useRef } from 'react';

export interface ThrottleOptions {
  /**
   * 是否在第一次调用时立即执行（默认: true）
   */
  leading?: boolean;
  /**
   * 是否在节流期结束后执行最后一次调用（默认: true）
   */
  trailing?: boolean;
}

/**
 * Throttle hook for limiting function execution frequency
 *
 * @param callback - The function to throttle
 * @param delay - Throttle delay in milliseconds
 * @param options - Throttle behavior options
 * @returns Throttled version of the callback
 *
 * @example
 * ```tsx
 * const handleUpdate = useThrottle((data) => {
 *   console.log('Update:', data);
 * }, 100);
 * ```
 */
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
  options: ThrottleOptions = {},
): T {
  const { leading = true, trailing = true } = options;

  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastArgsRef = useRef<any[] | undefined>(undefined);

  // Cleanup effect that runs when dependencies change OR on unmount
  useEffect(() => {
    // Clear any pending trailing updates when callback/delay/options change
    return () => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
      // Clear pending arguments to prevent stale data
      lastArgsRef.current = undefined;
    };
  }, [callback, delay, leading, trailing]);

  const throttledCallback = useCallback(
    (...args: any[]) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRunRef.current;

      // Clear any pending trailing call
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }

      if (timeSinceLastRun >= delay) {
        // Execute immediately (leading edge)
        if (leading) {
          lastRunRef.current = now;
          callback(...args);
        } else {
          lastArgsRef.current = args;
        }
      } else {
        // Schedule trailing execution if enabled
        if (trailing) {
          lastArgsRef.current = args;
          const remainingTime = delay - timeSinceLastRun;

          timeoutRef.current = setTimeout(() => {
            lastRunRef.current = Date.now();
            if (lastArgsRef.current) {
              callback(...lastArgsRef.current);
              lastArgsRef.current = undefined;
            }
            timeoutRef.current = undefined;
          }, remainingTime);
        }
      }
    },
    [callback, delay, leading, trailing],
  ) as T;

  return throttledCallback;
}
