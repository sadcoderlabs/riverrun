/**
 * CancelOrderUseCase
 *
 * 職責：Cancel a single order
 *
 * Dependencies:
 * - OrderExchangePort: Execute cancellation on the exchange
 * - TryGetAgentWalletUseCase: Get agent wallet for signing
 * - MarketPort: Get market metadata
 *
 * Note: Does NOT require BuilderFee approval (cancellations are free)
 */

import type { TryGetAgentWalletUseCase } from '@/contexts/agent/application/usecases/TryGetAgentWalletUseCase';
import type { MarketPort } from '@/contexts/market/ports/marketPort';
import type { OrderExchangePort } from '../ports/OrderExchangePort';
import type { CancelOrderParams, OrderResult } from '../../ports/types';

export class CancelOrderUseCase {
  constructor(
    private readonly orderExchange: OrderExchangePort,
    private readonly tryGetAgentWallet: TryGetAgentWalletUseCase,
    private readonly marketPort: MarketPort,
  ) {}

  async execute(params: CancelOrderParams): Promise<OrderResult> {
    try {
      // 1. Get approved agent wallet
      const { agentWallet, errorReason } = await this.tryGetAgentWallet.execute();
      if (!agentWallet) {
        return {
          success: false,
          error: errorReason || 'Unable to get agent wallet for cancellation',
        };
      }

      // 2. Get asset metadata
      const market = this.marketPort.getMarketByCoin(params.coin);
      if (!market) {
        return { success: false, error: `Unable to find market data for ${params.coin}` };
      }

      // 3. Execute cancellation
      await this.orderExchange.cancelOrders(agentWallet.signer, {
        cancels: [
          {
            a: market.assetId,
            o: params.orderId,
          },
        ],
      });

      // 4. Success
      return { success: true };
    } catch (error) {
      console.error('[CancelOrderUseCase] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel order',
      };
    }
  }
}
