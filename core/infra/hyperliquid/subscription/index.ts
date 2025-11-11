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

// Core types
export type { SubscriptionHandle, SubscriptionConfig, SubscriptionEntry } from './types';
