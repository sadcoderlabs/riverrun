import type { Signer } from 'ethers';
import type { BuilderFeeApprovalPort } from '../ports/BuilderFeeApprovalPort';
import type { OrderExchangePort, OrderExchangeResult } from '../ports/OrderExchangePort';
import type { OrderTelemetryPort } from '../ports/OrderTelemetryPort';
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

export class PlaceOrderUseCase {
  constructor(
    private readonly exchange: OrderExchangePort,
    private readonly builderFee: BuilderFeeApprovalPort,
    private readonly telemetry: OrderTelemetryPort,
  ) {}

  async execute(cmd: PlaceOrderCommand): Promise<OrderExchangeResult> {
    const draft = OrderDraft.fromCommand(cmd);
    draft.ensureValid();

    await this.builderFee.ensureApproved({
      trader: draft.traderAddress,
      allowance: draft.requiredAllowance,
    });

    const result = await this.exchange.order(cmd.signer, OrderAssembler.toOrderParameters(draft));

    await this.telemetry.trackPlacedOrder({
      coin: draft.coin,
      orderId: result.orderId,
      ok: result.status === 'accepted',
      rejectReason: result.rejectReason,
    });

    return result;
  }
}
