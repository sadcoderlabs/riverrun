/**
 * CancelOrdersUseCase
 *
 * Responsibility: Cancel multiple orders in batch
 *
 * Dependencies:
 * - OrderExchangePort: Execute batch cancellation on the exchange
 * - TryGetAgentWalletUseCase: Get agent wallet for signing
 * - MarketPort: Get market metadata
 *
 * Note: Does NOT require BuilderFee approval (cancellations are free)
 */

import type { TryGetAgentWalletUseCase } from '@/contexts/agent/application/usecases/TryGetAgentWalletUseCase';
import type { MarketPort } from '@/contexts/market/ports/marketPort';
import type { OrderExchangePort } from '../ports/OrderExchangePort';
import type { CancelOrdersParams, OrderResult } from '../../ports/types';

export class CancelOrdersUseCase {
  constructor(
    private readonly orderExchange: OrderExchangePort,
    private readonly tryGetAgentWallet: TryGetAgentWalletUseCase,
    private readonly marketPort: MarketPort,
  ) {}

  async execute(params: CancelOrdersParams): Promise<OrderResult> {
    try {
      // 1. Get approved agent wallet
      const { agentWallet, errorReason } = await this.tryGetAgentWallet.execute();
      if (!agentWallet) {
        return {
          success: false,
          error: errorReason || 'Unable to get agent wallet for batch cancellation',
        };
      }

      // 2. Build cancels array
      const cancels = params.orders
        .map(order => {
          const market = this.marketPort.getMarketByCoin(order.coin);
          if (!market) {
            console.error(`Unable to find market data for ${order.coin}`);
            return undefined;
          }
          return {
            a: market.assetId,
            o: order.orderId,
          };
        })
        .filter((cancel): cancel is { a: number; o: number } => cancel !== undefined);

      // 3. Validate at least one valid order exists
      if (cancels.length === 0) {
        return { success: false, error: 'No valid orders to cancel' };
      }

      // 4. Execute batch cancellation
      await this.orderExchange.cancelOrders(agentWallet.signer, { cancels });

      // 5. Success
      return { success: true };
    } catch (error) {
      console.error('[CancelOrdersUseCase] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel orders',
      };
    }
  }
}
