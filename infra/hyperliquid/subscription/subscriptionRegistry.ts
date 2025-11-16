/**
 * Subscription Registry
 *
 * Centralized registry for subscription configurations.
 * Each subscription type (e.g., 'webData2', 'orderUpdates') has a configuration
 * that defines how to subscribe and generate unique keys.
 */

import type { SubscriptionConfig, SubscriptionConfigMap } from './types';

/**
 * Registry for subscription configurations
 */
class SubscriptionRegistry {
  private configs: SubscriptionConfigMap = {};

  /**
   * Register a subscription type configuration
   *
   * @param type - Unique identifier for this subscription type (e.g., 'webData2')
   * @param config - Configuration for this subscription type
   */
  register<TParams, TData>(type: string, config: SubscriptionConfig<TParams, TData>): void {
    if (this.configs[type]) {
      console.warn(`[SubscriptionRegistry] Overwriting existing config for type: ${type}`);
    }
    this.configs[type] = config;
  }

  /**
   * Get configuration for a subscription type
   *
   * @param type - Subscription type identifier
   * @returns Configuration for this type, or undefined if not registered
   */
  getConfig<TParams = any, TData = any>(
    type: string,
  ): SubscriptionConfig<TParams, TData> | undefined {
    return this.configs[type];
  }
}

// Export singleton instance
export const subscriptionRegistry = new SubscriptionRegistry();
