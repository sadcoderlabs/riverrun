/**
 * Rate-limited InfoClient wrapper
 *
 * This module provides wrapper functions for all InfoClient methods,
 * automatically applying rate limiting through HyperliquidRateLimiter.
 *
 * All functions in this module are already rate-limited, so you can call them directly
 * without worrying about exceeding Hyperliquid's 1200 weight/minute limit.
 *
 * Usage:
 * ```typescript
 * import { metaAndAssetCtxs } from '@/lib/hyperliquid/client/infoClient';
 *
 * // Instead of:
 * // const result = await hyperliquidRateLimiter.execute(
 * //   () => infoClient.metaAndAssetCtxs(),
 * //   'metaAndAssetCtxs'
 * // );
 *
 * // Simply use:
 * const result = await metaAndAssetCtxs();
 * ```
 */

import type * as hl from '@nktkas/hyperliquid';
import { getInfoClient } from './getter';
import { hyperliquidRateLimiter, REQUEST_WEIGHTS } from './RateLimiter';

// ============================================================================
// Meta & Asset Context
// ============================================================================

/**
 * Get meta information and asset contexts for all available markets
 *
 * Weight: 20
 * Returns: [Meta, AssetCtx[]]
 *
 * @param params - Optional parameters
 * @param params.dex - DEX name for HIP-3 assets (e.g., "xyz"). If omitted, returns validator perps.
 *
 * @example
 * ```typescript
 * // Validator perps
 * const [meta, assetCtxs] = await metaAndAssetCtxs();
 *
 * // HIP-3 DEX
 * const [hip3Meta, hip3Ctxs] = await metaAndAssetCtxs({ dex: 'xyz' });
 * ```
 */
export async function metaAndAssetCtxs(params?: {
  dex?: string;
}): Promise<hl.MetaAndAssetCtxsResponse> {
  const infoClient = getInfoClient();
  return await hyperliquidRateLimiter.execute(
    () => infoClient.metaAndAssetCtxs(params),
    REQUEST_WEIGHTS.metaAndAssetCtxs,
  );
}

// ============================================================================
// HIP-3 DEX Information
// ============================================================================

/**
 * Get all HIP-3 perp DEXs
 *
 * Weight: 20
 * Returns: Array where index 0 is null (validator perps), followed by HIP-3 DEXs
 *
 * @example
 * ```typescript
 * const dexs = await perpDexs();
 * // dexs[0] = null (validator perps)
 * // dexs[1] = { name: 'xyz', fullName: 'XYZ', ... }
 * ```
 */
export async function perpDexs(): Promise<hl.PerpDexsResponse> {
  const infoClient = getInfoClient();
  return await hyperliquidRateLimiter.execute(
    () => infoClient.perpDexs(),
    REQUEST_WEIGHTS.perpDexs,
  );
}

// ============================================================================
// Market Data
// ============================================================================

/**
 * Get mid prices for all markets
 *
 * Weight: 2
 * Returns: Record<string, string> - Map of coin symbol to mid price
 *
 * @param params - Optional parameters
 * @param params.dex - DEX name for HIP-3 assets (e.g., "xyz"). If omitted, returns validator perps.
 *
 * @example
 * ```typescript
 * // Validator perps
 * const mids = await allMids();
 * console.log('BTC mid price:', mids['BTC']);
 *
 * // HIP-3 DEX
 * const hip3Mids = await allMids({ dex: 'xyz' });
 * console.log('xyz:TSLA price:', hip3Mids['xyz:TSLA']);
 * ```
 */
export async function allMids(params?: { dex?: string }): Promise<hl.AllMidsResponse> {
  const infoClient = getInfoClient();
  return await hyperliquidRateLimiter.execute(
    () => infoClient.allMids(params),
    REQUEST_WEIGHTS.allMids,
  );
}

/**
 * Get candlestick data for a specific coin and time range
 *
 * Weight: 60 (base 20 + additional weight per 60 items returned)
 *
 * @example
 * ```typescript
 * const candles = await candleSnapshot({
 *   coin: 'BTC',
 *   interval: '1h',
 *   startTime: Date.now() - 24 * 60 * 60 * 1000,
 *   endTime: Date.now(),
 * });
 * ```
 */
export async function candleSnapshot(
  params: Parameters<hl.InfoClient['candleSnapshot']>[0],
): Promise<hl.CandleSnapshotResponse> {
  const infoClient = getInfoClient();
  return await hyperliquidRateLimiter.execute(
    () => infoClient.candleSnapshot(params),
    REQUEST_WEIGHTS.candleSnapshot,
  );
}

// ============================================================================
// User Account Data
// ============================================================================

/**
 * Get clearinghouse state for a user (account balances, margins, etc.)
 *
 * Weight: 2
 *
 * @example
 * ```typescript
 * const state = await clearinghouseState({ user: '0x...' });
 * console.log('Withdrawable:', state.withdrawable);
 * ```
 */
export async function clearinghouseState(
  params: Parameters<hl.InfoClient['clearinghouseState']>[0],
): Promise<hl.ClearinghouseStateResponse> {
  const infoClient = getInfoClient();
  return await hyperliquidRateLimiter.execute(
    () => infoClient.clearinghouseState(params),
    REQUEST_WEIGHTS.clearinghouseState,
  );
}

/**
 * Get comprehensive web data for a user (positions, balances, open orders, etc.)
 *
 * Weight: 20
 *
 * @example
 * ```typescript
 * const data = await webData2({ user: '0x...' });
 * console.log('Positions:', data.assetPositions);
 * ```
 */
export async function webData2(
  params: Parameters<hl.InfoClient['webData2']>[0],
): Promise<hl.WebData2Response> {
  const infoClient = getInfoClient();
  return await hyperliquidRateLimiter.execute(
    () => infoClient.webData2(params),
    REQUEST_WEIGHTS.webData2,
  );
}

/**
 * Get active asset data for a specific coin and user
 *
 * Weight: 20
 *
 * @example
 * ```typescript
 * const data = await activeAssetData({ coin: 'BTC', user: '0x...' });
 * console.log('Position:', data.position);
 * ```
 */
export async function activeAssetData(
  params: Parameters<hl.InfoClient['activeAssetData']>[0],
): Promise<hl.ActiveAssetDataResponse> {
  const infoClient = getInfoClient();
  return await hyperliquidRateLimiter.execute(
    () => infoClient.activeAssetData(params),
    REQUEST_WEIGHTS.activeAssetData,
  );
}

/**
 * Get user fill history (executed trades)
 *
 * Weight: 20
 *
 * @example
 * ```typescript
 * const fills = await userFills({ user: '0x...' });
 * console.log('Recent fills:', fills);
 * ```
 */
export async function userFills(
  params: Parameters<hl.InfoClient['userFills']>[0],
): Promise<hl.UserFillsResponse> {
  const infoClient = getInfoClient();
  return await hyperliquidRateLimiter.execute(
    () => infoClient.userFills(params),
    REQUEST_WEIGHTS.userFills,
  );
}

/**
 * Get frontend open orders for a user
 *
 * Weight: 20
 *
 * @example
 * ```typescript
 * const orders = await frontendOpenOrders({ user: '0x...' });
 * console.log('Open orders:', orders);
 * ```
 */
export async function frontendOpenOrders(
  params: Parameters<hl.InfoClient['frontendOpenOrders']>[0],
): Promise<hl.FrontendOpenOrdersResponse> {
  const infoClient = getInfoClient();
  return await hyperliquidRateLimiter.execute(
    () => infoClient.frontendOpenOrders(params),
    REQUEST_WEIGHTS.frontendOpenOrders,
  );
}

/**
 * Get order status by order ID
 *
 * Weight: 2
 *
 * @example
 * ```typescript
 * const status = await orderStatus({ user: '0x...', oid: 123456 });
 * console.log('Order status:', status);
 * ```
 */
export async function orderStatus(
  params: Parameters<hl.InfoClient['orderStatus']>[0],
): Promise<hl.OrderStatusResponse> {
  const infoClient = getInfoClient();
  return await hyperliquidRateLimiter.execute(
    () => infoClient.orderStatus(params),
    REQUEST_WEIGHTS.orderStatus,
  );
}

// ============================================================================
// Referral & Builder Fee
// ============================================================================

/**
 * Get referral information for a user
 *
 * Weight: 20
 *
 * @example
 * ```typescript
 * const referral = await referralInfo({ user: '0x...' });
 * console.log('Referrer:', referral.referredBy);
 * ```
 */
export async function referralInfo(
  params: Parameters<hl.InfoClient['referral']>[0],
): Promise<hl.ReferralResponse> {
  const infoClient = getInfoClient();
  return await hyperliquidRateLimiter.execute(
    () => infoClient.referral(params),
    REQUEST_WEIGHTS.referral,
  );
}

/**
 * Get maximum approved builder fee for a user and builder
 *
 * Weight: 20
 *
 * @example
 * ```typescript
 * const maxFee = await maxBuilderFee({ user: '0x...', builder: '0x...' });
 * console.log('Max approved fee:', maxFee);
 * ```
 */
export async function maxBuilderFee(
  params: Parameters<hl.InfoClient['maxBuilderFee']>[0],
): Promise<number> {
  const infoClient = getInfoClient();
  return await hyperliquidRateLimiter.execute(
    () => infoClient.maxBuilderFee(params),
    REQUEST_WEIGHTS.maxBuilderFee,
  );
}

/**
 * Get user fee rates and discounts
 *
 * Weight: 20
 *
 * Returns fee schedule, user's current rates, and active discounts (referral, staking).
 *
 * @example
 * ```typescript
 * const fees = await userFees({ user: '0x...' });
 * console.log('Taker rate:', fees.userCrossRate);
 * console.log('Maker rate:', fees.userAddRate);
 * console.log('Referral discount:', fees.activeReferralDiscount);
 * ```
 */
export async function userFees(
  params: Parameters<hl.InfoClient['userFees']>[0],
): Promise<hl.UserFeesResponse> {
  const infoClient = getInfoClient();
  return await hyperliquidRateLimiter.execute(
    () => infoClient.userFees(params),
    REQUEST_WEIGHTS.userFees,
  );
}

// ============================================================================
// Agent Management
// ============================================================================

/**
 * Get extra agents for a user
 *
 * Weight: 20
 *
 * @example
 * ```typescript
 * const agents = await extraAgents({ user: '0x...' });
 * console.log('Approved agents:', agents);
 * ```
 */
export async function extraAgents(
  params: Parameters<hl.InfoClient['extraAgents']>[0],
): Promise<hl.ExtraAgentsResponse> {
  const infoClient = getInfoClient();
  return await hyperliquidRateLimiter.execute(
    () => infoClient.extraAgents(params),
    REQUEST_WEIGHTS.extraAgents,
  );
}
