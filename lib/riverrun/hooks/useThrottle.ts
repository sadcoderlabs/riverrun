import { useEffect, useRef, useState } from 'react';

/**
 * Hook to throttle a value - only update at most once per delay period
 *
 * This is useful for performance optimization when dealing with high-frequency updates
 * like WebSocket price feeds. Instead of re-rendering on every update, it limits
 * updates to a maximum frequency.
 *
 * @param value - The value to throttle
 * @param delay - Minimum time between updates in milliseconds
 * @returns The throttled value
 *
 * @example
 * ```tsx
 * // WebSocket updates every 10-50ms
 * const { data: rawPrices } = useAllMids();
 *
 * // Throttle to update at most once every 100ms
 * const throttledPrices = useThrottle(rawPrices, 100);
 *
 * // UI only re-renders once every 100ms instead of 10-20 times per second
 * ```
 */
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdateRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate >= delay) {
      // Enough time has passed - update immediately
      lastUpdateRef.current = now;
      setThrottledValue(value);
    } else {
      // Too soon - schedule update for later
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const remainingTime = delay - timeSinceLastUpdate;
      timeoutRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        setThrottledValue(value);
        timeoutRef.current = null;
      }, remainingTime);
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return throttledValue;
}
