import type { Signer } from 'ethers';
import type { OrderParameters } from '@nktkas/hyperliquid/api/exchange';

export type OrderExecutionResponse = {
  ok: boolean;
  orderId?: number;
  clientOrderId?: string;
  errorCode?: string;
};

export type OrderCancelRequest = {
  clientOrderIds: string[];
};

export interface OrderExchangePort {
  order(signer: Signer, request: OrderParameters): Promise<OrderExecutionResponse>;
  cancel(signer: Signer, request: OrderCancelRequest): Promise<OrderExecutionResponse>;
}
