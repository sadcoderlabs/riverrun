/**
 * Hyperliquid Repositories
 *
 * Repository Pattern implementation for Hyperliquid data access.
 * Each repository encapsulates data access logic and provides a clean interface.
 *
 * Repositories handle:
 * - HTTP + WebSocket hybrid strategies
 * - Data source coordination
 * - Caching (if needed)
 * - Error handling
 *
 * Can be reused across multiple Domain Contexts.
 */

export { WebData2Repository } from './webData2Repository';
export type { SubscriptionHandle } from './webData2Repository';
