import { useCallback } from 'react';

import { useNotificationPreferenceStore } from '../stores/notificationPreferenceStore';

/**
 * Hook for managing push notification preferences.
 *
 * @example
 * ```tsx
 * const { isEnabled, setEnabled, toggle } = useNotificationPreference();
 *
 * // Toggle notifications
 * <Switch checked={isEnabled} onCheckedChange={toggle} />
 * ```
 */
export function useNotificationPreference() {
  const isEnabled = useNotificationPreferenceStore(state => state.isEnabled);
  const setEnabled = useNotificationPreferenceStore(state => state.setEnabled);
  const hasHydrated = useNotificationPreferenceStore(state => state._hasHydrated);

  const toggle = useCallback(() => {
    setEnabled(!isEnabled);
  }, [isEnabled, setEnabled]);

  return {
    /** Whether push notifications are enabled */
    isEnabled,
    /** Set notification preference */
    setEnabled,
    /** Toggle notification preference */
    toggle,
    /** Whether the store has hydrated from storage */
    hasHydrated,
  };
}
