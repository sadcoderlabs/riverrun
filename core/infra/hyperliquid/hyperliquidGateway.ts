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
import * as infoClient from './client/infoClient';
import { getMasterExchangeClient, getAgentExchangeClient } from './client/getter';
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
   * Subscribe to activeAssetData stream with HTTP+WS hybrid strategy
   *
   * ActiveAssetData contains:
   * - User leverage settings (leverage value and margin mode)
   * - Available trading amounts
   * - Position information for a specific coin
   *
   * Hybrid Strategy:
   * 1. HTTP fetch for immediate data (~100ms)
   * 2. WebSocket subscription for real-time updates (~1s)
   *
   * @param params - { user: string, coin: string }
   * @param callback - Called when data arrives (both HTTP and WS)
   * @returns Subscription handle for cleanup
   *
   * @example
   * ```typescript
   * const gateway = new HyperliquidGateway();
   * const handle = await gateway.subscribeActiveAssetData(
   *   { user: '0x123...', coin: 'BTC' },
   *   (data) => {
   *     console.log('Leverage:', data.leverage);
   *   }
   * );
   *
   * // Later...
   * await handle.unsubscribe();
   * ```
   */
  async subscribeActiveAssetData(
    params: { user: string; coin: string },
    callback: (data: any) => void,
  ): Promise<SubscriptionHandle> {
    // Step 1: HTTP fetch for immediate data
    // This provides fast initial display (~100ms)
    try {
      const httpData = await infoClient.activeAssetData({
        user: params.user,
        coin: params.coin.toUpperCase(),
      });
      callback(httpData); // Invoke callback immediately
    } catch (error) {
      // HTTP failure is not fatal - WebSocket will provide data shortly
      console.warn(
        '[HyperliquidGateway] ActiveAssetData HTTP fetch failed, relying on WebSocket:',
        error,
      );
    }

    // Step 2: Establish WebSocket subscription for real-time updates
    // This provides continuous updates (~1s for initial connection)
    const handle = await subscriptionManager.subscribe(
      'activeAssetData',
      { user: params.user, coin: params.coin },
      callback,
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
  // History Operations (Read)
  // ============================================================================

  /**
   * Fetch user fills (trading history) from Hyperliquid API (HTTP only)
   *
   * Returns all historical fills for the specified user.
   * Sorted by most recent first in the response.
   *
   * @param userAddress - User wallet address
   * @returns Array of fills
   */
  async fetchUserFills(userAddress: string): Promise<unknown[]> {
    return await infoClient.userFills({ user: userAddress });
  }

  /**
   * Subscribe to real-time fill updates via WebSocket
   *
   * Receives incremental fill updates as they occur.
   * Callback will be invoked with new fills data.
   *
   * @param userAddress - User wallet address
   * @param callback - Callback function to receive fill updates
   * @returns Subscription handle with unsubscribe method
   */
  async subscribeUserFills(
    userAddress: string,
    callback: (data: unknown) => void,
  ): Promise<SubscriptionHandle> {
    const handle = await subscriptionManager.subscribe(
      'userFills',
      { user: userAddress },
      callback,
    );

    return {
      unsubscribe: async () => {
        await subscriptionManager.unsubscribe(handle);
      },
    };
  }

  // ============================================================================
  // Order Operations (Read)
  // ============================================================================

  /**
   * Fetch frontend open orders via HTTP
   *
   * Returns the current open orders for a user from Hyperliquid API.
   *
   * @param userAddress - User wallet address
   * @returns Promise resolving to open orders data
   */
  async getFrontendOpenOrders(userAddress: string): Promise<unknown> {
    return await infoClient.frontendOpenOrders({ user: userAddress });
  }

  /**
   * Subscribe to order updates via WebSocket
   *
   * Receives real-time updates when orders are placed, filled, or cancelled.
   *
   * @param userAddress - User wallet address
   * @param callback - Called when order updates arrive
   * @returns Subscription handle for cleanup
   */
  async subscribeOrderUpdates(
    userAddress: string,
    callback: (data: unknown) => void,
  ): Promise<SubscriptionHandle> {
    const handle = await subscriptionManager.subscribe(
      'orderUpdates',
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
   * Get order status via HTTP
   *
   * Retrieves the current status of a specific order.
   *
   * @param userAddress - User wallet address
   * @param oid - Order ID
   * @returns Promise resolving to order status data
   */
  async getOrderStatus(userAddress: string, oid: number): Promise<unknown> {
    return await infoClient.orderStatus({ user: userAddress, oid });
  }

  // ============================================================================
  // Agent Operations (Write + Read)
  // ============================================================================

  /**
   * Get agent exchange client for trading operations
   *
   * @param agentSigner - Signer for the agent wallet
   * @returns ExchangeClient instance for agent trading
   */
  getAgentExchangeClient(agentSigner: Signer): hl.ExchangeClient {
    return getAgentExchangeClient(agentSigner);
  }

  /**
   * Approve agent on blockchain
   *
   * Background Recovery Strategy:
   * When using Reown wallet, the app backgrounds during signing.
   * Upon return, network may not be immediately available, causing
   * "Network request failed" errors. This method implements retry
   * logic to handle these transient network issues.
   *
   * @param signer - Signer for the master wallet
   * @param agentAddress - Agent address to approve
   * @param agentName - Name for the agent
   */
  async approveAgent(signer: Signer, agentAddress: string, agentName: string): Promise<void> {
    const client = getMasterExchangeClient(signer);

    // Retry configuration
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1500; // Wait for network to recover

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await client.approveAgent({
          agentAddress,
          agentName,
        });
        return; // Success - exit
      } catch (error) {
        // Check if error is network-related
        const isNetworkError =
          error instanceof Error &&
          (error.message.includes('Network request failed') ||
            error.message.includes('network') ||
            error.name === 'HttpRequestError');

        // If not a network error or last attempt, throw immediately
        if (!isNetworkError || attempt === MAX_RETRIES) {
          throw error;
        }

        // Network error - wait and retry
        console.warn(
          `[HyperliquidGateway] Network error on attempt ${attempt}/${MAX_RETRIES}, retrying in ${RETRY_DELAY_MS}ms...`,
        );
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  /**
   * Revoke agent from blockchain
   *
   * Background Recovery Strategy:
   * Similar to approveAgent, implements retry logic to handle
   * network issues when returning from wallet app after signing.
   *
   * @param signer - Signer for the master wallet
   * @param agentName - Name of the agent to revoke
   */
  async revokeAgent(signer: Signer, agentName: string): Promise<void> {
    const client = getMasterExchangeClient(signer);

    // Retry configuration
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1500; // Wait for network to recover

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Revoke by setting agent address to 0x0
        await client.approveAgent({
          agentAddress: '0x0000000000000000000000000000000000000000',
          agentName,
        });
        return; // Success - exit
      } catch (error) {
        // Check if error is network-related
        const isNetworkError =
          error instanceof Error &&
          (error.message.includes('Network request failed') ||
            error.message.includes('network') ||
            error.name === 'HttpRequestError');

        // If not a network error or last attempt, throw immediately
        if (!isNetworkError || attempt === MAX_RETRIES) {
          throw error;
        }

        // Network error - wait and retry
        console.warn(
          `[HyperliquidGateway] Network error on attempt ${attempt}/${MAX_RETRIES}, retrying in ${RETRY_DELAY_MS}ms...`,
        );
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
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

  // ============================================================================
  // Bridge Operations (Write + Read)
  // ============================================================================

  /**
   * Get clearinghouse state for a user
   *
   * Includes withdrawable balance, account value, margin information, etc.
   *
   * @param userAddress - User address
   * @returns Clearinghouse state including withdrawable balance
   */
  async getClearinghouseState(userAddress: string): Promise<hl.ClearinghouseStateResponse> {
    return await infoClient.clearinghouseState({ user: userAddress });
  }

  /**
   * Withdraw USDC from Hyperliquid to Arbitrum
   *
   * Uses the withdraw3 API to transfer USDC to an Arbitrum address.
   * A $1 USDC fee is automatically deducted from the amount.
   *
   * @param signer - Signer for the master wallet
   * @param destination - Arbitrum address to receive USDC
   * @param amount - Amount to withdraw (human-readable, e.g., "10.5")
   * @returns Withdrawal response with status
   */
  async withdraw(signer: Signer, destination: string, amount: string): Promise<{ status: string }> {
    const client = getMasterExchangeClient(signer);
    const response = await client.withdraw3({
      destination: destination as `0x${string}`,
      amount: amount,
    });

    return { status: response.status };
  }
}
