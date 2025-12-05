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
import type { BuilderFeeExchangePort } from '@/contexts/builderFee/application/ports/BuilderFeeExchangePort';
import type { ReferralExchangePort } from '@/contexts/referral/application/ports/ReferralExchangePort';
import type { HyperliquidBridgePort } from '@/contexts/bridge/application/ports/HyperliquidBridgePort';
import type { AgentExchangePort } from '@/contexts/agent/application/ports/AgentExchangePort';
import type { MarginExchangePort } from '@/contexts/margin/application/ports/MarginExchangePort';
import type { OrderExchangePort } from '@/contexts/order/application/ports/OrderExchangePort';
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
 * Re-export ExchangeClient type for use in ports
 */
export type ExchangeClient = hl.ExchangeClient;

/**
 * Hyperliquid Gateway
 *
 * Provides unified access to Hyperliquid data with HTTP+WS hybrid strategy.
 * All methods are read-only operations.
 *
 * This gateway also implements domain ports directly without additional adapter layers:
 * - BuilderFeeExchangePort: Builder fee approval operations
 * - ReferralExchangePort: Referral code operations
 * - HyperliquidBridgePort: Bridge withdrawal operations
 * - AgentExchangePort: Agent approval and management operations
 * - MarginExchangePort: Margin/leverage operations
 * - OrderExchangePort: Order placement and cancellation operations
 */
export class HyperliquidGateway
  implements
    BuilderFeeExchangePort,
    ReferralExchangePort,
    HyperliquidBridgePort,
    AgentExchangePort,
    MarginExchangePort,
    OrderExchangePort
{
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
   * Subscribe to WebData3 stream for positions across ALL DEXs
   *
   * WebData3 contains positions from ALL perpDexStates:
   * - Validator perps (index 0)
   * - HIP-3 DEXs (index 1+): xyz, etc.
   *
   * Use this to display HIP-3 positions like GOOGL, TSLA, etc.
   *
   * Note: WebData3 is WebSocket-only (no HTTP endpoint), so initial data
   * may take slightly longer (~1s) compared to webData2's hybrid approach.
   *
   * @param userAddress - User wallet address
   * @param callback - Called when data arrives
   * @returns Subscription handle for cleanup
   *
   * @example
   * ```typescript
   * const gateway = new HyperliquidGateway();
   * const handle = await gateway.subscribeWebData3('0x123...', (data) => {
   *   // Positions from ALL DEXs
   *   data.perpDexStates.forEach(dex => {
   *     console.log('Positions:', dex.clearinghouseState.assetPositions);
   *   });
   * });
   *
   * // Later...
   * await handle.unsubscribe();
   * ```
   */
  async subscribeWebData3(
    userAddress: string,
    callback: (data: hl.WsWebData3Event) => void,
  ): Promise<SubscriptionHandle> {
    // WebData3 is WebSocket-only - no HTTP endpoint available
    const handle = await subscriptionManager.subscribe<hl.WsWebData3Event>(
      'webData3',
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
   * @param dex - Optional DEX name for HIP-3 assets (e.g., "xyz")
   * @returns Subscription handle for cleanup
   *
   * @example
   * ```typescript
   * const gateway = new HyperliquidGateway();
   *
   * // Validator perps
   * const handle = await gateway.subscribeAllMids((prices) => {
   *   console.log('BTC price:', prices['BTC']);
   * });
   *
   * // HIP-3 DEX
   * const hip3Handle = await gateway.subscribeAllMids((prices) => {
   *   console.log('xyz:TSLA price:', prices['xyz:TSLA']);
   * }, 'xyz');
   * ```
   */
  async subscribeAllMids(
    callback: (prices: Record<string, string>) => void,
    dex?: string,
  ): Promise<SubscriptionHandle> {
    // Step 1: HTTP fetch for immediate data
    // This provides fast initial display (~100ms)
    try {
      const httpPrices = await infoClient.allMids(dex ? { dex } : undefined);
      callback(httpPrices); // Invoke callback immediately with HTTP data
    } catch (error) {
      // HTTP failure is not fatal - WebSocket will provide data shortly
      console.warn('[HyperliquidGateway] AllMids HTTP fetch failed, relying on WebSocket:', error);
    }

    // Step 2: Establish WebSocket subscription for real-time updates
    // This provides continuous updates (~1s for initial connection)
    const handle = await subscriptionManager.subscribe(
      'allMids',
      dex ? { dex } : {}, // Only pass dex if defined
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
    // Note: Do NOT use toUpperCase() - HIP-3 assets require lowercase DEX prefix
    try {
      const httpData = await infoClient.activeAssetData({
        user: params.user,
        coin: params.coin,
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
   * @param dex - Optional DEX name for HIP-3 assets (e.g., "xyz")
   * @returns Tuple of [Meta, AssetCtx[]]
   *
   * @example
   * ```typescript
   * const gateway = new HyperliquidGateway();
   *
   * // Validator perps
   * const [meta, assetCtxs] = await gateway.fetchMetaAndAssetCtxs();
   *
   * // HIP-3 DEX
   * const [hip3Meta, hip3Ctxs] = await gateway.fetchMetaAndAssetCtxs('xyz');
   * ```
   */
  async fetchMetaAndAssetCtxs(dex?: string): Promise<hl.MetaAndAssetCtxsResponse> {
    return await infoClient.metaAndAssetCtxs(dex ? { dex } : undefined);
  }

  /**
   * Fetch all HIP-3 perp DEXs
   *
   * Returns array where index 0 is null (validator perps),
   * followed by HIP-3 DEX info objects.
   *
   * @returns Array of PerpDex info (or null for index 0)
   */
  async fetchPerpDexs(): Promise<hl.PerpDexsResponse> {
    return await infoClient.perpDexs();
  }

  /**
   * Fetch spot metadata including tokens list
   *
   * Used to resolve collateral token names for HIP-3 DEXs.
   * Returns tokens array with index -> name mapping.
   *
   * @returns Spot metadata with tokens list
   */
  async fetchSpotMeta(): Promise<hl.SpotMetaResponse> {
    return await infoClient.spotMeta();
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
   * Fetch frontend open orders via HTTP from ALL DEXs
   *
   * Returns the current open orders for a user from Hyperliquid API,
   * including both validator perps and HIP-3 DEXs (like xyz for GOOGL, TSLA).
   *
   * @param userAddress - User wallet address
   * @param hip3DexNames - HIP-3 DEX names to fetch orders from (e.g., ['xyz'])
   * @returns Promise resolving to merged open orders from all DEXs
   */
  async getFrontendOpenOrders(
    userAddress: string,
    hip3DexNames: string[] = [],
  ): Promise<unknown[]> {
    // Fetch validator perps orders + HIP-3 DEX orders in parallel
    const [validatorOrders, ...hip3OrdersArrays] = await Promise.all([
      infoClient.frontendOpenOrders({ user: userAddress }),
      ...hip3DexNames.map(dexName =>
        infoClient.frontendOpenOrders({ user: userAddress, dex: dexName }),
      ),
    ]);

    // Merge all orders
    return [...validatorOrders, ...hip3OrdersArrays.flat()];
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
  // Margin Operations (Write)
  // ============================================================================

  /**
   * Update leverage and margin mode for an asset
   *
   * This method implements the MarginExchangePort interface.
   *
   * @param signer - Signer for the agent wallet executing the operation
   * @param params - Update parameters
   * @param params.asset - Asset ID
   * @param params.isCross - True for cross margin, false for isolated
   * @param params.leverage - Leverage value
   */
  async updateLeverage(
    signer: Signer,
    params: {
      asset: number;
      isCross: boolean;
      leverage: number;
    },
  ): Promise<void> {
    const client = getAgentExchangeClient(signer);
    await client.updateLeverage({
      asset: params.asset,
      isCross: params.isCross,
      leverage: params.leverage,
    });
  }

  // ============================================================================
  // HIP-3 DEX Abstraction
  // ============================================================================

  /**
   * Enable HIP-3 DEX abstraction for the user
   *
   * This allows automatic collateral transfer from the main perps balance
   * when trading HIP-3 assets. Uses agent wallet signature (no user prompt).
   *
   * Note: This only works when transitioning from null to true (first-time enable).
   * Subsequent calls are no-ops but won't throw errors.
   *
   * @param signer - Signer for the agent wallet
   */
  async enableDexAbstraction(signer: Signer): Promise<void> {
    const client = getAgentExchangeClient(signer);
    await client.agentEnableDexAbstraction();
  }

  // ============================================================================
  // Order Operations (OrderExchangePort)
  // ============================================================================

  /**
   * Place an order on the exchange
   *
   * This method implements the OrderExchangePort interface.
   *
   * @param signer - Signer for the agent wallet executing the order
   * @param request - Order request parameters
   * @returns Order response from exchange
   */
  async placeOrder(
    signer: Signer,
    request: import('@/contexts/order/application/ports/OrderExchangePort').OrderRequest,
  ): Promise<import('@/contexts/order/application/ports/OrderExchangePort').OrderResponse> {
    const client = getAgentExchangeClient(signer);
    return await client.order({
      orders: request.orders,
      grouping: request.grouping,
      builder: request.builder,
    });
  }

  /**
   * Cancel orders on the exchange
   *
   * This method implements the OrderExchangePort interface.
   *
   * @param signer - Signer for the agent wallet executing the cancellation
   * @param request - Cancel request parameters
   */
  async cancelOrders(
    signer: Signer,
    request: import('@/contexts/order/application/ports/OrderExchangePort').CancelRequest,
  ): Promise<void> {
    const client = getAgentExchangeClient(signer);
    await client.cancel({
      cancels: request.cancels,
    });
  }

  // ============================================================================
  // Builder Fee Operations (Write + Read)
  // ============================================================================

  /**
   * Approve builder fee on blockchain
   *
   * Background Recovery Strategy:
   * Similar to approveAgent, implements retry logic to handle
   * network issues when returning from wallet app after signing.
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

    // Retry configuration
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1500; // Wait for network to recover

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await client.approveBuilderFee({
          maxFeeRate,
          builder: builderAddress,
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

  /**
   * Get user fee rates and discounts from exchange
   *
   * Returns raw fee data for the user including base rates and active discounts.
   *
   * @param walletAddress - User wallet address
   * @returns Raw user fee rates and discounts
   */
  async getUserFees(walletAddress: string): Promise<{
    userCrossRate: string;
    userAddRate: string;
    activeReferralDiscount: string;
    activeStakingDiscount: { discount: string };
  }> {
    const response = await infoClient.userFees({ user: walletAddress });
    return {
      userCrossRate: response.userCrossRate,
      userAddRate: response.userAddRate,
      activeReferralDiscount: response.activeReferralDiscount,
      activeStakingDiscount: {
        discount: response.activeStakingDiscount.discount,
      },
    };
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

  // ============================================================================
  // HyperliquidBridgePort implementation
  // ============================================================================

  /**
   * Get withdrawable USDC balance on Hyperliquid (HyperliquidBridgePort)
   *
   * @param walletAddress - User's wallet address
   * @returns Formatted withdrawable balance (e.g., "10.5") or undefined if unavailable
   */
  async getWithdrawableBalance(walletAddress: string): Promise<string | undefined> {
    try {
      const state = await this.getClearinghouseState(walletAddress);
      return state.withdrawable;
    } catch (error) {
      console.error('[HyperliquidGateway] Failed to get withdrawable balance:', error);
      return undefined;
    }
  }

  /**
   * Withdraw USDC from Hyperliquid to Arbitrum (HyperliquidBridgePort)
   *
   * @param signer - Ethers.js signer for signing the withdrawal request
   * @param destinationAddress - Arbitrum address to receive USDC
   * @param amount - Amount in USDC (human-readable, e.g., "10.5")
   * @returns Withdrawal status (e.g., "ok")
   * @throws Error if withdrawal fails
   */
  async withdrawUsdc(signer: Signer, destinationAddress: string, amount: string): Promise<string> {
    const response = await this.withdraw(signer, destinationAddress, amount);
    return response.status;
  }
}
