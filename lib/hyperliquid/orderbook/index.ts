/**
 * OrderBook module exports
 * Centralized module for order book data, precision utilities, and hooks
 *
 * Note: useOrderBook has been migrated to the unified subscription system.
 * Use `useSubscription('orderBook', { coin, nSigFigs })` instead.
 *
 * Note: useRecentTrades has been split into two hooks:
 * - useTrades (from '@/lib/hyperliquid/hooks') for Hyperliquid trades subscription
 * - useLatestPrice (from '@/lib/riverrun/orderbook') for extracting latest price
 */

// Utilities
export * from './orderbookPrecision';
