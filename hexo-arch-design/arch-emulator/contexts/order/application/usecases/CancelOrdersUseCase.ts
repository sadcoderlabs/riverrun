import type { Signer } from 'ethers';
import type { OrderExchangePort } from '../ports/OrderExchangePort';
import type { OrderResult } from './PlaceOrderUseCase';

export type CancelOrdersCommand = {
  signer: Signer;
  clientOrderIds: string[];
};

export class CancelOrdersUseCase {
  constructor(private readonly exchange: OrderExchangePort) {}

  async execute(cmd: CancelOrdersCommand): Promise<OrderResult> {
    const response = await this.exchange.cancel(cmd.signer, { clientOrderIds: cmd.clientOrderIds });

    return {
      status: response.ok ? 'accepted' : 'rejected',
      rejectReason: response.errorCode,
    };
  }
}
