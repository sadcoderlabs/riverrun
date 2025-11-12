import React from 'react';

import { useHistorySubscription } from './useHistorySubscription';

/**
 * HistoryCompositionProvider - Manages trading history subscriptions
 *
 * This provider automatically manages history data subscriptions based on wallet lifecycle.
 * It uses the useHistorySubscription hook to handle all subscription logic.
 *
 * @example
 * ```tsx
 * <HistoryCompositionProvider>
 *   <YourApp />
 * </HistoryCompositionProvider>
 * ```
 */
export function HistoryCompositionProvider({ children }: { children: React.ReactNode }) {
  // Manage history subscriptions automatically
  useHistorySubscription();

  return <>{children}</>;
}
