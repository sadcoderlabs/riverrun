import type { Signer } from 'ethers';
import type { OrderExchangePort, OrderExchangeResult } from '../ports/OrderExchangePort';

export type CancelOrdersCommand = {
  signer: Signer;
  clientOrderIds: string[];
};

export class CancelOrdersUseCase {
  constructor(private readonly exchange: OrderExchangePort) {}

  async execute(cmd: CancelOrdersCommand): Promise<OrderExchangeResult> {
    return this.exchange.cancel(cmd.signer, { clientOrderIds: cmd.clientOrderIds });
  }
}
