/**
 * Hyperliquid API Rate Limiter
 *
 * Implements rate limiting based on Hyperliquid's documented limits:
 * - REST API: 1200 weight/minute
 * - Different endpoints have different weights (2, 20, 60)
 *
 * Reference: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/rate-limits-and-user-limits.md
 */

// @ts-ignore - Using direct import to avoid dynamic imports in React Native
import RateLimiterMemory from 'rate-limiter-flexible/lib/RateLimiterMemory.js';

// ============================================================================
// Request Weights (based on Hyperliquid documentation)
// ============================================================================

/**
 * Weight for each API endpoint
 * Based on Hyperliquid rate limit documentation
 */
export const REQUEST_WEIGHTS = {
  // Lightweight (weight = 2)
  allMids: 2,
  l2Book: 2,
  clearinghouseState: 2,
  orderStatus: 2,

  // Medium (weight = 20) - most info requests
  metaAndAssetCtxs: 20,
  perpDexs: 20,
  frontendOpenOrders: 20,
  userFills: 20,
  webData2: 20,
  activeAssetData: 20,
  userTokenBalances: 20,
  spotMetaAndAssetCtxs: 20,
  maxBuilderFee: 20,
  referral: 20,
  extraAgents: 20,
  userFees: 20,

  // Heavy (weight = 60)
  candleSnapshot: 60, // Base 20 + additional weight per 60 items returned
  userRateLimit: 60,

  // Default weight for unknown endpoints
  default: 20,
} as const;

export type EndpointName = keyof typeof REQUEST_WEIGHTS;

// ============================================================================
// Hyperliquid Rate Limiter
// ============================================================================

export class HyperliquidRateLimiter {
  private rateLimiter: any; // RateLimiterMemory from rate-limiter-flexible

  constructor() {
    // Hyperliquid limit: 1200 weight per minute
    this.rateLimiter = new RateLimiterMemory({
      points: 1200, // Total weight allowed
      duration: 60, // 60 seconds window
      execEvenly: false, // Allow bursts (important for initial loads)
    });
  }

  /**
   * Execute a request with rate limiting
   *
   * Simple implementation that relies on rate-limiter-flexible's built-in waiting mechanism.
   * When rate limit is exceeded, it automatically waits until capacity is available.
   *
   * @param request - Function that performs the HTTP request
   * @param weight - Request weight (see REQUEST_WEIGHTS for reference values)
   * @returns Promise that resolves with the request result
   */
  async execute<T>(request: () => Promise<T>, weight: number): Promise<T> {
    // Wait until we have capacity, then execute
    // rate-limiter-flexible automatically handles waiting when limit is exceeded
    await this.rateLimiter.consume('hyperliquid', weight);

    // Execute the request
    return await request();
  }
}

// Singleton instance
export const hyperliquidRateLimiter = new HyperliquidRateLimiter();
