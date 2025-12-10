/**
 * Subscription Types
 *
 * Core types for the Hyperliquid subscription system.
 * Pure TypeScript implementation without external state management dependencies.
 */

import type * as hl from '@nktkas/hyperliquid';

// ============================================================================
// Subscription Configuration
// ============================================================================

/**
 * Configuration for a subscription type
 *
 * Defines how to subscribe to a specific data stream from Hyperliquid.
 *
 * @template TParams - Parameters needed for the subscription (e.g., { user: string })
 * @template TData - The data type returned by the subscription
 */
export interface SubscriptionConfig<TParams = any, TData = any> {
  /**
   * Generate a unique key for this subscription instance
   *
   * Used for RefCount management - subscriptions with same key share the same connection.
   *
   * @param params - Subscription parameters
   * @returns Unique key string
   */
  getKey: (params: TParams) => string;

  /**
   * Create WebSocket subscription
   *
   * @param params - Subscription parameters
   * @param callback - Called when new data arrives
   * @returns Hyperliquid Subscription object with unsubscribe method
   */
  subscribe: (params: TParams, callback: (data: TData) => void) => Promise<hl.Subscription>;
}

// ============================================================================
// Internal Management Types
// ============================================================================

/**
 * Internal subscription entry managed by SubscriptionManager
 *
 * Tracks refCount, WebSocket subscription, and data state.
 */
export interface SubscriptionEntry<TData = any> {
  /** Subscription type (e.g., 'webData2') */
  type: string;

  /** Unique key for this subscription */
  key: string;

  /** Reference count - number of subscribers using this subscription */
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

  /**
   * Map of callbacks by unique ID
   * Each subscriber has their own callback identified by a unique ID.
   * When unsubscribing, only that specific callback is removed.
   */
  callbacks: Map<string, (data: TData) => void>;
}

/**
 * Handle returned by subscribe() - used for unsubscribe()
 */
export interface SubscriptionHandle {
  /** Subscription type */
  type: string;

  /** Subscription key */
  key: string;

  /** Unique callback ID for this subscriber */
  callbackId: string;
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
