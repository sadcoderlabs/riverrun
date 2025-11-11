/**
 * Hyperliquid Subscription System
 *
 * Unified WebSocket subscription management for Hyperliquid.
 * Pure JavaScript implementation without state management dependencies.
 */

// Register subscription configurations
import './configs';

// Main service export
export {
  HyperliquidSubscriptionService,
  hyperliquidSubscriptionService,
} from './hyperliquidSubscriptionService';

// Registry for subscription configurations
export { subscriptionRegistry } from './subscriptionRegistry';

// Core types
export type { SubscriptionHandle, SubscriptionConfig, SubscriptionEntry } from './types';
