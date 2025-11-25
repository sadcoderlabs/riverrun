/**
 * PlaceOrderUseCase
 *
 * 職責：Place a unified order (Market/Limit with optional TP/SL)
 *
 * Dependencies:
 * - OrderExchangePort: Execute orders on the exchange
 * - TryGetAgentWalletUseCase: Get agent wallet for signing
 * - EnsureBuilderFeeUseCase: Ensure builder fee is approved
 * - MarketPort: Get market metadata
 */

import { roundPrice } from '@/app-internal/components/trade/priceUtils';
import type { TryGetAgentWalletUseCase } from '@/contexts/agent/application/usecases/TryGetAgentWalletUseCase';
import { getBuilderParam } from '@/contexts/builderFee/config';
import type { EnsureBuilderFeeUseCase } from '@/contexts/builderFee/application/usecases/EnsureBuilderFeeUseCase';
import type { MarketPort } from '@/contexts/market/ports/marketPort';
import type { TelemetryPort } from '@/contexts/telemetry/ports/telemetryPort';
import type { WalletPort } from '@/contexts/wallet/ports/walletPort';
import type { OrderExchangePort } from '../ports/OrderExchangePort';
import type { PlaceOrderParams, OrderResult } from '../../ports/types';
import { validateSizeDecimals, parseOrderResponse, buildTpSlOrdersHelper } from '../../ports/types';

export class PlaceOrderUseCase {
  constructor(
    private readonly orderExchange: OrderExchangePort,
    private readonly tryGetAgentWallet: TryGetAgentWalletUseCase,
    private readonly ensureBuilderFee: EnsureBuilderFeeUseCase,
    private readonly marketPort: MarketPort,
    private readonly walletPort: WalletPort,
    private readonly telemetryService: TelemetryPort,
  ) {}

  async execute(params: PlaceOrderParams): Promise<OrderResult> {
    try {
      // 1. Validate parameters
      if (params.orderType === 'Market' && !params.marketPrice) {
        return { success: false, error: 'Market price is required for market orders' };
      }
      if (params.orderType === 'Limit' && !params.limitPrice) {
        return { success: false, error: 'Limit price is required for limit orders' };
      }
      if (params.tpSl && !params.tpSl.tpTriggerPrice && !params.tpSl.slTriggerPrice) {
        return {
          success: false,
          error: 'At least one of TP or SL must be provided when tpSl is enabled',
        };
      }

      // 2. Get master wallet (for BuilderFee approval)
      const masterWallet = await this.walletPort.active();
      if (!masterWallet) {
        return { success: false, error: 'Master wallet not available' };
      }

      // 3. Ensure BuilderFee is approved (must use master wallet)
      const masterSigner = await this.walletPort.getSigner();
      const feeResult = await this.ensureBuilderFee.execute({
        signer: masterSigner,
        walletAddress: masterWallet.address,
      });
      if (!feeResult.isApproved) {
        return {
          success: false,
          error: feeResult.errorReason || 'Builder fee not approved',
        };
      }

      // 4. Get Agent Wallet (for placing order)
      const { agentWallet, errorReason } = await this.tryGetAgentWallet.execute();
      if (!agentWallet) {
        return { success: false, error: errorReason || 'Agent wallet not available' };
      }

      // 5. Get market metadata
      const market = this.marketPort.getMarketByCoin(params.coin);
      if (!market) {
        return { success: false, error: `Market data not found for ${params.coin}` };
      }

      // 6. Validate size decimals
      validateSizeDecimals(params.size, market.szDecimals, params.coin);

      // 7. Build orders array
      const orders: any[] = [];
      const isLong = params.side === 'Long';
      const roundedSize = parseFloat(params.size).toFixed(market.szDecimals);

      // Parent order (market or limit)
      if (params.orderType === 'Market') {
        // Market order: use extreme price (±5% to ensure immediate execution)
        const extremePrice = isLong
          ? params.marketPrice! * 1.05 // 5% above market for buys
          : params.marketPrice! * 0.95; // 5% below market for sells
        const price = roundPrice(extremePrice, market.szDecimals, false);

        orders.push({
          a: market.assetId,
          b: isLong,
          p: price,
          s: roundedSize,
          r: params.reduceOnly ?? false,
          t: { limit: { tif: 'Ioc' as const } }, // Immediate-Or-Cancel
        });
      } else {
        // Limit order
        orders.push({
          a: market.assetId,
          b: isLong,
          p: params.limitPrice!,
          s: roundedSize,
          r: params.reduceOnly ?? false,
          t: { limit: { tif: 'Gtc' as const } }, // Good-Til-Cancel
        });
      }

      // TP/SL orders (if provided)
      if (params.tpSl) {
        const tpSlOrders = buildTpSlOrdersHelper(params.tpSl, {
          assetId: market.assetId,
          isLong,
          size: params.size,
          szDecimals: market.szDecimals,
        });
        orders.push(...tpSlOrders);
      }

      // 8. Determine grouping strategy
      const grouping = params.tpSl ? 'normalTpsl' : 'na';

      // 9. Execute order (using agent wallet signer)
      const response = await this.orderExchange.placeOrder(agentWallet.signer, {
        orders,
        grouping,
        builder: getBuilderParam(),
      });

      // 10. Parse response for errors
      const errors = parseOrderResponse(response);
      if (errors.length > 0) {
        return { success: false, error: errors.join(', ') };
      }

      // 11. Success
      return { success: true };
    } catch (error) {
      console.error('[PlaceOrderUseCase] Error:', error);
      this.telemetryService.captureError(error, {
        component: 'PlaceOrderUseCase',
        action: 'execute',
        extra: {
          coin: params.coin,
          side: params.side,
          orderType: params.orderType,
          size: params.size,
        },
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to place order',
      };
    }
  }
}
