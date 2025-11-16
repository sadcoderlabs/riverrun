import type { Signer } from 'ethers';
import * as hl from '@nktkas/hyperliquid';
import type { OrderParameters } from '@nktkas/hyperliquid/api/exchange';
import type {
  OrderExchangePort,
  OrderExecutionResponse,
  OrderCancelRequest,
} from '../../contexts/order/application/ports/OrderExchangePort';

/**
 * 真實 Hyperliquid Gateway 實作，使用官方 SDK 的 ExchangeClient 下單。
 */
export class HyperliquidExchangeGateway implements OrderExchangePort {
  private readonly transport: hl.HttpTransport;
  private readonly clients = new Map<string, hl.ExchangeClient>();

  constructor(transport?: hl.HttpTransport) {
    this.transport = transport ?? new hl.HttpTransport();
  }

  async order(signer: Signer, request: OrderParameters): Promise<OrderExecutionResponse> {
    const client = this.getClient(signer);
    const res = await client.order(request);

    const firstStatus = res.response.data.statuses[0];
    if ('error' in firstStatus) {
      return { ok: false, errorCode: firstStatus.error };
    }

    const resting = 'resting' in firstStatus ? firstStatus.resting : undefined;
    const filled = 'filled' in firstStatus ? firstStatus.filled : undefined;

    return {
      ok: true,
      orderId: resting?.oid ?? filled?.oid,
      clientOrderId: resting?.cloid ?? filled?.cloid,
    };
  }

  async cancel(signer: Signer, request: OrderCancelRequest): Promise<OrderExecutionResponse> {
    const client = this.getClient(signer);
    await client.cancel({ cloids: request.clientOrderIds });
    return { ok: true };
  }

  private getClient(signer: Signer): hl.ExchangeClient {
    const key = signer.address.toLowerCase();
    if (!this.clients.has(key)) {
      this.clients.set(key, new hl.ExchangeClient({ wallet: signer, transport: this.transport }));
    }
    return this.clients.get(key)!;
  }
}
