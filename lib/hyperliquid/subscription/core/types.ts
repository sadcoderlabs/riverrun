import type * as hl from '@nktkas/hyperliquid';

/**
 * Core types for the unified subscription system
 */

// ============================================================================
// Subscription Configuration
// ============================================================================

/**
 * Configuration for a subscription type
 *
 * Focused solely on WebSocket subscription management.
 * HTTP data fetching should be handled separately using TanStack Query.
 *
 * @template TParams - Parameters needed for the subscription (e.g., { user: string, coin: string })
 * @template TData - The data type returned by the subscription
 */
export interface SubscriptionConfig<TParams = any, TData = any> {
  /**
   * Generate a unique key for this subscription instance
   * Used for RefCount management - subscriptions with same key share the same connection
   */
  getKey: (params: TParams) => string;

  /**
   * WebSocket subscription function
   * @returns Hyperliquid Subscription object with unsubscribe method
   */
  subscribe: (params: TParams, callback: (data: TData) => void) => Promise<hl.Subscription>;
}

// ============================================================================
// Subscription State
// ============================================================================

/**
 * State of a subscription (returned to components)
 */
export interface SubscriptionState<TData = any> {
  /** Subscription data */
  data: TData | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | undefined;
}

// ============================================================================
// Internal Management Types
// ============================================================================

/**
 * Internal subscription entry managed by SubscriptionManager
 * Tracks refCount, WebSocket subscription, and state
 */
export interface SubscriptionEntry<TData = any> {
  /** Subscription type (e.g., 'activeAssetData') */
  type: string;
  /** Unique key for this subscription */
  key: string;
  /** Reference count - number of components using this subscription */
  refCount: number;
  /** Current data */
  data: TData | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | undefined;
  /** WebSocket subscription reference */
  subscription: hl.Subscription | null;
  /** Whether subscription is currently paused (App Lifecycle) */
  isPaused: boolean;
  /** Stored params for resuming after pause */
  params: any;
  /** Stored callback for resuming after pause */
  callback: ((data: TData) => void) | null;
}

/**
 * Handle returned by subscribe() - used for unsubscribe()
 */
export interface SubscriptionHandle {
  type: string;
  key: string;
}

// ============================================================================
// Registry Types
// ============================================================================

/**
 * Registry of all subscription configurations
 */
export type SubscriptionConfigMap = {
  [type: string]: SubscriptionConfig<any, any>;
};
