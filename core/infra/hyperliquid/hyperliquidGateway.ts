/**
 * Hyperliquid Gateway
 *
 * Gateway Pattern (DDD): Encapsulates access to external Hyperliquid system.
 * This is the single entry point for all Hyperliquid read-only data operations.
 *
 * Responsibilities:
 * - Fetch data from Hyperliquid Info API (HTTP)
 * - Subscribe to real-time data streams (WebSocket)
 * - Implement HTTP + WebSocket hybrid strategy for optimal UX
 *
 * Does NOT contain:
 * - Business logic (e.g., data transformation)
 * - Write operations (see HyperliquidAdapter for blockchain operations)
 *
 * Pattern: Gateway Pattern
 * "An object that encapsulates access to an external system or resource"
 * - Martin Fowler, Patterns of Enterprise Application Architecture
 *
 * Strategy:
 * 1. HTTP fetch first (~100ms) - immediate data for fast initial display
 * 2. WebSocket subscription (~1s) - continuous real-time updates
 */

import type * as hl from '@nktkas/hyperliquid';
import type { Signer } from 'ethers';
import * as infoClient from '@/lib/hyperliquid/client/infoClient';
import { getMasterExchangeClient } from '@/lib/hyperliquid/client/getter';
import { subscriptionManager } from './subscription';

/**
 * Subscription handle for managing lifecycle
 */
export interface SubscriptionHandle {
  unsubscribe: () => Promise<void>;
}

/**
 * Hyperliquid Gateway
 *
 * Provides unified access to Hyperliquid data with HTTP+WS hybrid strategy.
 * All methods are read-only operations.
 */
export class HyperliquidGateway {
  /**
   * Subscribe to WebData2 stream with HTTP+WS hybrid strategy
   *
   * WebData2 contains:
   * - User positions (assetPositions)
   * - Account state (crossMarginSummary, withdrawable)
   * - Margin details (marginSummary)
   *
   * Hybrid Strategy:
   * 1. HTTP fetch for immediate data (~100ms)
   * 2. WebSocket subscription for real-time updates (~1s)
   *
   * @param userAddress - User wallet address
   * @param callback - Called when data arrives (both HTTP and WS)
   * @returns Subscription handle for cleanup
   *
   * @example
   * ```typescript
   * const gateway = new HyperliquidGateway();
   * const handle = await gateway.subscribeWebData2('0x123...', (data) => {
   *   console.log('Positions:', data.assetPositions);
   * });
   *
   * // Later...
   * await handle.unsubscribe();
   * ```
   */
  async subscribeWebData2(
    userAddress: string,
    callback: (data: hl.WebData2Response) => void,
  ): Promise<SubscriptionHandle> {
    // Step 1: HTTP fetch for immediate data
    // This provides fast initial display (~100ms)
    try {
      const httpData = await infoClient.webData2({ user: userAddress });
      callback(httpData); // Invoke callback immediately
    } catch (error) {
      // HTTP failure is not fatal - WebSocket will provide data shortly
      console.warn('[HyperliquidGateway] WebData2 HTTP fetch failed, relying on WebSocket:', error);
    }

    // Step 2: Establish WebSocket subscription for real-time updates
    // This provides continuous updates (~1s for initial connection)
    const handle = await subscriptionManager.subscribe<hl.WebData2Response>(
      'webData2',
      { user: userAddress },
      callback,
    );

    return {
      unsubscribe: async () => {
        await subscriptionManager.unsubscribe(handle);
      },
    };
  }

  /**
   * Subscribe to allMids stream with HTTP+WS hybrid strategy
   *
   * Corresponds to Hyperliquid's allMids subscription.
   * Provides mid prices for all trading pairs.
   * Returns Record<coin, price> (e.g., { "BTC": "45000.5", "ETH": "3000.2" })
   *
   * Hybrid Strategy:
   * 1. HTTP fetch for immediate prices (~100ms)
   * 2. WebSocket subscription for real-time updates
   *
   * @param callback - Called when prices are updated
   * @returns Subscription handle for cleanup
   *
   * @example
   * ```typescript
   * const gateway = new HyperliquidGateway();
   * const handle = await gateway.subscribeAllMids((prices) => {
   *   console.log('BTC price:', prices['BTC']);
   *   console.log('ETH price:', prices['ETH']);
   * });
   *
   * // Later...
   * await handle.unsubscribe();
   * ```
   */
  async subscribeAllMids(
    callback: (prices: Record<string, string>) => void,
  ): Promise<SubscriptionHandle> {
    // Step 1: HTTP fetch for immediate data
    // This provides fast initial display (~100ms)
    try {
      const httpPrices = await infoClient.allMids();
      callback(httpPrices); // Invoke callback immediately with HTTP data
    } catch (error) {
      // HTTP failure is not fatal - WebSocket will provide data shortly
      console.warn('[HyperliquidGateway] AllMids HTTP fetch failed, relying on WebSocket:', error);
    }

    // Step 2: Establish WebSocket subscription for real-time updates
    // This provides continuous updates (~1s for initial connection)
    const handle = await subscriptionManager.subscribe(
      'allMids',
      {}, // No params needed for allMids
      data => {
        // data is AllMidsData { mids: Record<string, string> }
        callback(data.mids);
      },
    );

    return {
      unsubscribe: async () => {
        await subscriptionManager.unsubscribe(handle);
      },
    };
  }

  /**
   * Fetch metaAndAssetCtxs from Hyperliquid API (HTTP only)
   *
   * Corresponds to Hyperliquid's metaAndAssetCtxs endpoint.
   * Returns raw meta and assetCtxs data.
   * No business logic - just pure data fetching.
   *
   * Business logic (e.g., convertRawMarket) should be handled in Service layer.
   *
   * @returns Tuple of [Meta, AssetCtx[]]
   *
   * @example
   * ```typescript
   * const gateway = new HyperliquidGateway();
   * const [meta, assetCtxs] = await gateway.fetchMetaAndAssetCtxs();
   *
   * // Process in Service layer
   * const markets = meta.universe.map((asset, idx) =>
   *   convertRawMarket(asset, assetCtxs[idx], idx)
   * );
   * ```
   */
  async fetchMetaAndAssetCtxs(): Promise<hl.MetaAndAssetCtxsResponse> {
    return await infoClient.metaAndAssetCtxs();
  }

  // ============================================================================
  // Agent Operations (Write + Read)
  // ============================================================================

  /**
   * Approve agent on blockchain
   *
   * @param signer - Signer for the master wallet
   * @param agentAddress - Agent address to approve
   * @param agentName - Name for the agent
   */
  async approveAgent(signer: Signer, agentAddress: string, agentName: string): Promise<void> {
    const client = getMasterExchangeClient(signer);
    await client.approveAgent({
      agentAddress,
      agentName,
    });
  }

  /**
   * Revoke agent from blockchain
   *
   * @param signer - Signer for the master wallet
   * @param agentName - Name of the agent to revoke
   */
  async revokeAgent(signer: Signer, agentName: string): Promise<void> {
    const client = getMasterExchangeClient(signer);
    // Revoke by setting agent address to 0x0
    await client.approveAgent({
      agentAddress: '0x0000000000000000000000000000000000000000',
      agentName,
    });
  }

  /**
   * Get all agents for a master address from blockchain
   *
   * @param masterAddress - Master wallet address
   * @returns Array of agent information
   */
  async getAgents(masterAddress: string): Promise<
    {
      address: string;
      name: string | undefined;
    }[]
  > {
    try {
      const agents = await infoClient.extraAgents({ user: masterAddress });
      return agents.map((agent: { address: string; name?: string }) => ({
        address: agent.address,
        name: agent.name,
      }));
    } catch (error) {
      console.error('[HyperliquidGateway] Failed to get agents:', error);
      return [];
    }
  }

  // ============================================================================
  // Builder Fee Operations (Write + Read)
  // ============================================================================

  /**
   * Approve builder fee on blockchain
   *
   * @param signer - Signer for the master wallet
   * @param maxFeeRate - Maximum fee rate as percentage string (e.g., '0.1%')
   * @param builderAddress - Builder address to approve
   */
  async approveBuilderFee(
    signer: Signer,
    maxFeeRate: string,
    builderAddress: string,
  ): Promise<void> {
    const client = getMasterExchangeClient(signer);
    await client.approveBuilderFee({
      maxFeeRate,
      builder: builderAddress,
    });
  }

  /**
   * Get maximum approved builder fee for a user-builder pair
   *
   * @param userAddress - User address
   * @param builderAddress - Builder address
   * @returns Maximum approved fee in 0.1bps units
   */
  async getMaxBuilderFee(userAddress: string, builderAddress: string): Promise<number> {
    try {
      return await infoClient.maxBuilderFee({
        user: userAddress,
        builder: builderAddress,
      });
    } catch (error) {
      console.error('[HyperliquidGateway] Failed to get max builder fee:', error);
      return 0;
    }
  }

  // ============================================================================
  // Referral Operations (Write + Read)
  // ============================================================================

  /**
   * Set referrer code for the user
   *
   * @param signer - Signer for the master wallet
   * @param code - Referral code to set
   */
  async setReferrer(signer: Signer, code: string): Promise<void> {
    const client = getMasterExchangeClient(signer);
    await client.setReferrer({ code });
  }

  /**
   * Get referral information for a user
   *
   * @param userAddress - User address
   * @returns Referral information including referrer, code, and cumulative volume
   */
  async getReferralInfo(userAddress: string): Promise<{
    referrer: string | undefined;
    code: string | undefined;
    cumVlm: string;
  }> {
    try {
      const referral = await infoClient.referralInfo({ user: userAddress });
      return {
        referrer: referral.referredBy?.referrer,
        code: referral.referredBy?.code,
        cumVlm: referral.cumVlm,
      };
    } catch (error) {
      console.error('[HyperliquidGateway] Failed to get referral info:', error);
      return {
        referrer: undefined,
        code: undefined,
        cumVlm: '0',
      };
    }
  }
}
