/**
 * Unified Subscription System
 *
 * A centralized, type-safe subscription management system for Hyperliquid data feeds.
 *
 * Features:
 * - Reference counting: multiple components can share one subscription
 * - App Lifecycle management: automatic pause/resume when app goes to background/foreground
 * - Hybrid strategy: HTTP fetch + WebSocket subscription for fast initial load
 * - Rate limiting: prevents rapid HTTP requests
 * - Simple API: single `useSubscription` hook for all data types
 *
 * Usage:
 * ```typescript
 * import { useSubscription } from '@/lib/hyperliquid/subscription';
 *
 * // Subscribe to allMids
 * const { data: allMids, isLoading } = useSubscription('allMids');
 *
 * // Subscribe to orderBook
 * const { data: orderBook } = useSubscription('orderBook', {
 *   coin: 'BTC',
 *   nSigFigs: 3,
 * });
 * ```
 */

// Import configurations to register them
import './registry/hyperliquidSubscriptions';

// Export core types
export type { SubscriptionConfig, SubscriptionState, SubscriptionHandle } from './core/types';

// Export data types
export type {
  AllMidsData,
  OrderBookData,
  UserFillsData,
  ActiveAssetData,
  WebData2Data,
  OrderUpdatesData,
  MetaAndAssetCtxsData,
} from './types';

// Export registry (for adding custom subscriptions)
export { subscriptionRegistry } from './core/SubscriptionRegistry';

// Export manager (for advanced usage, debugging, or direct control)
export { subscriptionManager } from './core/SubscriptionManager';

// Export main hook (primary API)
export { useSubscription } from './hooks/useSubscription';
