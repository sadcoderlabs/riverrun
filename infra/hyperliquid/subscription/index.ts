/**
 * Hyperliquid Subscription System
 *
 * Unified WebSocket subscription management for Hyperliquid.
 * Pure JavaScript implementation without state management dependencies.
 */

// Register subscription configurations
import './configs';

// Main subscription manager
export { subscriptionManager } from './subscriptionManager';

// Registry for subscription configurations
export { subscriptionRegistry } from './subscriptionRegistry';

// React hook for subscriptions
export { useSubscription } from './hooks/useSubscription';
export type { SubscriptionState } from './hooks/useSubscription';

// Core types
export type { SubscriptionHandle, SubscriptionConfig, SubscriptionEntry } from './types';

// Subscription data types
export type {
  NSigFigs,
  OrderBookLevel,
  PrecisionMenuItem,
  AllMidsData,
  OrderBookData,
  UserFillsData,
  ActiveAssetData,
  ActiveAssetCtxData,
  TradesData,
  Trade,
  OrderUpdatesData,
  OrderUpdate,
} from './types/subscriptionData';
