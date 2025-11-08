/**
 * Hyperliquid API Rate Limiter
 *
 * Implements rate limiting based on Hyperliquid's documented limits:
 * - REST API: 1200 weight/minute
 * - Different endpoints have different weights (2, 20, 60)
 *
 * Reference: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/rate-limits-and-user-limits.md
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
  frontendOpenOrders: 20,
  userFills: 20,
  webData2: 20,
  activeAssetData: 20,
  userTokenBalances: 20,
  spotMetaAndAssetCtxs: 20,
  maxBuilderFee: 20,
  referral: 20,
  extraAgents: 20,

  // Heavy (weight = 60)
  candleSnapshot: 60, // Base 20 + additional weight per 60 items returned
  userRateLimit: 60,

  // Default weight for unknown endpoints
  default: 20,
} as const;

export type EndpointName = keyof typeof REQUEST_WEIGHTS;

// ============================================================================
// Priority Levels
// ============================================================================

export enum RequestPriority {
  // Critical: Initial HTTP fetch for subscriptions - must execute
  CRITICAL = 100,

  // High: User-initiated actions (orders, cancels)
  HIGH = 50,

  // Normal: Regular data fetches
  NORMAL = 10,

  // Low: Background refreshes from WebSocket callbacks
  LOW = 1,
}

// ============================================================================
// Request Queue Item
// ============================================================================

interface QueuedRequest<T> {
  priority: RequestPriority;
  weight: number;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
  endpoint: string;
}

// ============================================================================
// Hyperliquid Rate Limiter
// ============================================================================

export class HyperliquidRateLimiter {
  private rateLimiter: any; // RateLimiterMemory from rate-limiter-flexible
  private queue: QueuedRequest<any>[] = [];
  private processing = false;

  // Monitoring: track usage per minute window
  private usageHistory: Array<{ timestamp: number; endpoint: string; weight: number }> = [];
  private lastResetTime = Date.now();

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
   * @param request - Function that performs the HTTP request
   * @param endpoint - Endpoint name (used to determine weight)
   * @param priority - Request priority (CRITICAL, HIGH, NORMAL, LOW)
   * @returns Promise that resolves with the request result
   */
  async execute<T>(
    request: () => Promise<T>,
    endpoint: EndpointName | string,
    priority: RequestPriority = RequestPriority.NORMAL,
  ): Promise<T> {
    // Get weight for this endpoint
    const weight = REQUEST_WEIGHTS[endpoint as EndpointName] ?? REQUEST_WEIGHTS.default;

    // Track usage
    this.trackUsage(endpoint, weight);

    // Try to execute immediately if we have capacity
    try {
      await this.rateLimiter.consume('hyperliquid', weight);
      console.log(
        `[RateLimiter] ✅ Executing ${endpoint} (weight: ${weight}, priority: ${priority}, total: ${this.getCurrentWindowUsage()}/1200)`,
      );
      return await request();
    } catch (rateLimiterRes: any) {
      // Rate limit exceeded - queue the request
      const msBeforeNext = rateLimiterRes?.msBeforeNext || 1000;
      console.log(
        `[RateLimiter] ⏳ Queued ${endpoint} (weight: ${weight}, wait: ~${msBeforeNext}ms, priority: ${priority}, total: ${this.getCurrentWindowUsage()}/1200)`,
      );

      // Add to queue and wait
      return new Promise<T>((resolve, reject) => {
        this.queue.push({
          priority,
          weight,
          execute: request,
          resolve,
          reject,
          timestamp: Date.now(),
          endpoint,
        });

        // Sort queue by priority (highest first), then by timestamp (oldest first)
        this.queue.sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          return a.timestamp - b.timestamp;
        });

        // Start processing queue
        void this.processQueue();
      });
    }
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0]; // Peek at highest priority item

      try {
        // Try to consume points
        await this.rateLimiter.consume('hyperliquid', item.weight);

        // Success - remove from queue and execute
        this.queue.shift();

        const waitTime = Date.now() - item.timestamp;
        console.log(
          `[RateLimiter] ⚡ Executing queued ${item.endpoint} (weight: ${item.weight}, waited: ${waitTime}ms, priority: ${item.priority})`,
        );

        try {
          const result = await item.execute();
          item.resolve(result);
        } catch (err) {
          item.reject(err);
        }
      } catch (rateLimiterRes: any) {
        // Still rate limited - wait and retry
        const msBeforeNext = rateLimiterRes?.msBeforeNext || 1000;
        await new Promise(resolve => setTimeout(resolve, msBeforeNext));
      }
    }

    this.processing = false;
  }

  /**
   * Get current queue size (for monitoring)
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue (for cleanup)
   */
  clearQueue(): void {
    this.queue.forEach(item => {
      item.reject(new Error('Rate limiter queue cleared'));
    });
    this.queue = [];
  }

  /**
   * Track usage for monitoring
   */
  private trackUsage(endpoint: string, weight: number): void {
    const now = Date.now();

    // Add to history
    this.usageHistory.push({
      timestamp: now,
      endpoint,
      weight,
    });

    // Clean up old entries (older than 60 seconds)
    this.usageHistory = this.usageHistory.filter(entry => now - entry.timestamp < 60000);

    // Log summary every 60 seconds
    if (now - this.lastResetTime >= 60000) {
      this.printUsageSummary();
      this.lastResetTime = now;
    }
  }

  /**
   * Get current window usage (last 60 seconds)
   */
  private getCurrentWindowUsage(): number {
    const now = Date.now();
    return this.usageHistory
      .filter(entry => now - entry.timestamp < 60000)
      .reduce((sum, entry) => sum + entry.weight, 0);
  }

  /**
   * Print usage summary for monitoring
   */
  private printUsageSummary(): void {
    const totalWeight = this.getCurrentWindowUsage();
    const endpointCounts: Record<string, { count: number; totalWeight: number }> = {};

    this.usageHistory.forEach(entry => {
      if (!endpointCounts[entry.endpoint]) {
        endpointCounts[entry.endpoint] = { count: 0, totalWeight: 0 };
      }
      endpointCounts[entry.endpoint].count++;
      endpointCounts[entry.endpoint].totalWeight += entry.weight;
    });

    console.log('\n' + '='.repeat(60));
    console.log(`📊 [RateLimiter] Usage Summary (last 60s)`);
    console.log('='.repeat(60));
    console.log(`Total weight used: ${totalWeight}/1200 (${((totalWeight / 1200) * 100).toFixed(1)}%)`);
    console.log('\nBreakdown by endpoint:');

    Object.entries(endpointCounts)
      .sort((a, b) => b[1].totalWeight - a[1].totalWeight)
      .forEach(([endpoint, stats]) => {
        const percentage = ((stats.totalWeight / totalWeight) * 100).toFixed(1);
        console.log(
          `  ${endpoint.padEnd(25)} ${stats.count.toString().padStart(3)}x = ${stats.totalWeight.toString().padStart(4)} (${percentage}%)`,
        );
      });
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Get usage statistics (for debugging)
   */
  getUsageStats(): {
    currentUsage: number;
    queueSize: number;
    endpointBreakdown: Record<string, { count: number; totalWeight: number }>;
  } {
    const endpointCounts: Record<string, { count: number; totalWeight: number }> = {};

    this.usageHistory.forEach(entry => {
      if (!endpointCounts[entry.endpoint]) {
        endpointCounts[entry.endpoint] = { count: 0, totalWeight: 0 };
      }
      endpointCounts[entry.endpoint].count++;
      endpointCounts[entry.endpoint].totalWeight += entry.weight;
    });

    return {
      currentUsage: this.getCurrentWindowUsage(),
      queueSize: this.queue.length,
      endpointBreakdown: endpointCounts,
    };
  }
}

// Singleton instance
export const hyperliquidRateLimiter = new HyperliquidRateLimiter();
