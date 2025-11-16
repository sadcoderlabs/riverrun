import type { Signer } from 'ethers';
import type { OrderParameters } from '@nktkas/hyperliquid/api/exchange';

export type OrderExchangeResult = {
  orderId?: string;
  clientOrderId?: string;
  status: 'accepted' | 'rejected';
  rejectReason?: string;
};

export type OrderCancelRequest = {
  clientOrderIds: string[];
};

export interface OrderExchangePort {
  order(signer: Signer, request: OrderParameters): Promise<OrderExchangeResult>;
  cancel(signer: Signer, request: OrderCancelRequest): Promise<OrderExchangeResult>;
}
