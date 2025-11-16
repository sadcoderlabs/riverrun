import { OrderDirection } from '../valueObjects/OrderDirection';
import { OrderSize } from '../valueObjects/OrderSize';
import { TpSlPlan } from './TpSlPlan';
import type { PlaceOrderCommand } from '../../application/usecases/PlaceOrderUseCase';

export class OrderDraft {
  private constructor(
    public readonly coin: string,
    public readonly direction: OrderDirection,
    public readonly size: OrderSize,
    public readonly traderAddress: string,
    public readonly requiredAllowance: bigint,
    public readonly orderType: 'Market' | 'Limit',
    public readonly limitPrice?: number,
    public readonly marketPrice?: number,
    public readonly reduceOnly?: boolean,
    public readonly tpSlPlan?: TpSlPlan,
  ) {}

  static fromCommand(cmd: PlaceOrderCommand): OrderDraft {
    return new OrderDraft(
      cmd.coin,
      OrderDirection.fromSide(cmd.side),
      OrderSize.from(cmd.size),
      cmd.signer.address,
      OrderSize.computeAllowance(cmd.size),
      cmd.orderType,
      cmd.limitPrice,
      cmd.marketPrice,
      cmd.reduceOnly,
      cmd.tpSl ? TpSlPlan.fromCommand(cmd.tpSl) : undefined,
    );
  }

  ensureValid(): void {
    this.size.assertNotZero();
    this.direction.assertHasSupportedType();
    this.tpSlPlan?.assertConsistentWith();
  }
}
