import type { Signer } from 'ethers';
import type { BuilderFeeApprovalPort } from '../ports/approvals/BuilderFeeApprovalPort';
import type { OrderExchangePort } from '../ports/exchange/OrderExchangePort';
import type { OrderTelemetryPort } from '../ports/telemetry/OrderTelemetryPort';
import { OrderDraft } from '../../domain/entities/OrderDraft';
import { OrderAssembler } from '../services/OrderAssembler';

export type PlaceOrderCommand = {
  signer: Signer;
  coin: string;
  size: string;
  side: 'Long' | 'Short';
  orderType: 'Market' | 'Limit';
  limitPrice?: number;
  marketPrice?: number;
  reduceOnly?: boolean;
  tpSl?: {
    take?: { trigger: number; limit?: number };
    stop?: { trigger: number; limit?: number };
  };
};

export type OrderResult = {
  orderId?: string;
  status: 'accepted' | 'rejected';
  rejectReason?: string;
};

export class PlaceOrderUseCase {
  constructor(
    private readonly exchange: OrderExchangePort,
    private readonly builderFee: BuilderFeeApprovalPort,
    private readonly telemetry: OrderTelemetryPort,
  ) {}

  async execute(cmd: PlaceOrderCommand): Promise<OrderResult> {
    const draft = OrderDraft.fromCommand(cmd);
    draft.ensureValid();

    await this.builderFee.ensureApproved({
      trader: draft.traderAddress,
      allowance: draft.requiredAllowance,
    });

    const response = await this.exchange.order(cmd.signer, OrderAssembler.toOrderParameters(draft));

    await this.telemetry.trackPlacedOrder({
      coin: draft.coin,
      orderId: response.orderId?.toString(),
      ok: response.ok,
      rejectReason: response.errorCode,
    });

    return {
      orderId: response.orderId?.toString(),
      status: response.ok ? 'accepted' : 'rejected',
      rejectReason: response.errorCode,
    };
  }
}
