/**
 * PlaceCloseMarketOrderUseCase
 *
 * 職責：Close a position with a market order
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
import type { WalletPort } from '@/contexts/wallet/ports/walletPort';
import type { OrderExchangePort } from '../ports/OrderExchangePort';
import type { CloseMarketOrderParams, OrderResult } from '../../ports/types';
import { validateSizeDecimals, parseOrderResponse } from '../../ports/types';

export class PlaceCloseMarketOrderUseCase {
  constructor(
    private readonly orderExchange: OrderExchangePort,
    private readonly tryGetAgentWallet: TryGetAgentWalletUseCase,
    private readonly ensureBuilderFee: EnsureBuilderFeeUseCase,
    private readonly marketPort: MarketPort,
    private readonly walletPort: WalletPort,
  ) {}

  async execute(params: CloseMarketOrderParams): Promise<OrderResult> {
    try {
      // 1. Get master wallet (for BuilderFee approval)
      const masterWallet = await this.walletPort.active();
      if (!masterWallet) {
        return { success: false, error: 'Master wallet not available' };
      }

      // 2. Ensure BuilderFee is approved (must use master wallet)
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

      // 3. Get Agent Wallet (for placing order)
      const { agentWallet, errorReason } = await this.tryGetAgentWallet.execute();
      if (!agentWallet) {
        return { success: false, error: errorReason || 'Agent wallet not available' };
      }

      // 4. Get market metadata
      const market = this.marketPort.getMarketByCoin(params.coin);
      if (!market) {
        return { success: false, error: `Market data not found for ${params.coin}` };
      }

      // 5. Validate size decimals
      validateSizeDecimals(params.size, market.szDecimals, params.coin);

      // 6. Calculate extreme price for market order (±5% from market)
      const isLong = params.side === 'Long';
      const marketPriceNum = parseFloat(params.marketPrice);
      const extremePrice = isLong
        ? marketPriceNum * 1.05 // Buy: 5% above market
        : marketPriceNum * 0.95; // Sell: 5% below market
      const price = roundPrice(extremePrice, market.szDecimals, false);

      // 7. Build order parameters
      const orderParams = {
        a: market.assetId,
        b: isLong,
        p: price,
        s: params.size,
        r: true, // Always reduce-only for close orders
        t: { limit: { tif: 'Ioc' as const } }, // Immediate-Or-Cancel
      };

      // 8. Execute order (using agent wallet signer)
      const response = await this.orderExchange.placeOrder(agentWallet.signer, {
        orders: [orderParams],
        grouping: 'na',
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
      console.error('[PlaceCloseMarketOrderUseCase] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to place market close order',
      };
    }
  }
}
