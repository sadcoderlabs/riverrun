/**
 * PlaceTpSlOrdersUseCase
 *
 * 職責：Place TP/SL orders on an existing position
 *
 * Dependencies:
 * - OrderExchangePort: Execute orders on the exchange
 * - TryGetAgentWalletUseCase: Get agent wallet for signing
 * - EnsureBuilderFeeUseCase: Ensure builder fee is approved
 * - MarketPort: Get market metadata
 */

import type { TryGetAgentWalletUseCase } from '@/contexts/agent/application/usecases/TryGetAgentWalletUseCase';
import { getBuilderParam } from '@/contexts/builderFee/config';
import type { EnsureBuilderFeeUseCase } from '@/contexts/builderFee/application/usecases/EnsureBuilderFeeUseCase';
import type { MarketPort } from '@/contexts/market/ports/marketPort';
import type { WalletPort } from '@/contexts/wallet/ports/walletPort';
import type { OrderExchangePort } from '../ports/OrderExchangePort';
import type { TpSlOrderParams, OrderResult } from '../../ports/types';
import { validateSizeDecimals, parseOrderResponse, buildTpSlOrdersHelper } from '../../ports/types';

export class PlaceTpSlOrdersUseCase {
  constructor(
    private readonly orderExchange: OrderExchangePort,
    private readonly tryGetAgentWallet: TryGetAgentWalletUseCase,
    private readonly ensureBuilderFee: EnsureBuilderFeeUseCase,
    private readonly marketPort: MarketPort,
    private readonly walletPort: WalletPort,
  ) {}

  async execute(params: TpSlOrderParams): Promise<OrderResult> {
    try {
      // 1. Validate at least one TP or SL is provided
      if (!params.tpTriggerPrice && !params.slTriggerPrice) {
        return { success: false, error: 'At least one of TP or SL must be provided' };
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

      // 7. Build TP/SL orders
      const orders = buildTpSlOrdersHelper(
        {
          tpTriggerPrice: params.tpTriggerPrice,
          tpLimitPrice: params.tpLimitPrice,
          slTriggerPrice: params.slTriggerPrice,
          slLimitPrice: params.slLimitPrice,
        },
        {
          assetId: market.assetId,
          isLong: params.isLong,
          size: params.size,
          szDecimals: market.szDecimals,
        },
      );

      // 8. Execute orders with positionTpsl grouping (using agent wallet signer)
      const response = await this.orderExchange.placeOrder(agentWallet.signer, {
        orders,
        grouping: 'positionTpsl',
        builder: getBuilderParam(),
      });

      // 9. Parse response for errors
      const errors = parseOrderResponse(response);
      if (errors.length > 0) {
        return { success: false, error: errors.join(', ') };
      }

      // 10. Success
      return { success: true };
    } catch (error) {
      console.error('[PlaceTpSlOrdersUseCase] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to place TP/SL orders',
      };
    }
  }
}
