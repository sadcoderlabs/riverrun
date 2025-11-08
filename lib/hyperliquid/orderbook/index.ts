/**
 * OrderBook module exports
 * Centralized module for order book data, precision utilities, and hooks
 *
 * Note: useOrderBook has been migrated to the unified subscription system.
 * Use `useSubscription('orderBook', { coin, nSigFigs })` instead.
 */

// Hooks
export * from './useRecentTrades';

// Utilities
export * from './orderbookPrecision';
