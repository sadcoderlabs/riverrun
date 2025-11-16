import type { OrderParameters } from '@nktkas/hyperliquid/api/exchange';
import type { OrderDraft } from '../../domain/entities/OrderDraft';

export class OrderAssembler {
  /**
   * 將 OrderDraft 轉成 Hyperliquid SDK 的 OrderParameters。
   * 在 sample 中先假設 assetId = 0，實務上應由 MarketPort 提供。
   */
  static toOrderParameters(draft: OrderDraft, assetId = 0): OrderParameters {
    const orders: OrderParameters['orders'] = [
      {
        a: assetId,
        b: draft.direction.asBoolean(),
        p: (draft.orderType === 'Market' ? draft.marketPrice! : draft.limitPrice!).toString(),
        s: draft.size.toString(),
        r: draft.reduceOnly ?? false,
        t: {
          limit: {
            tif: draft.orderType === 'Market' ? 'Ioc' : 'Gtc',
          },
        },
      },
    ];

    if (draft.tpSlPlan?.raw.take) {
      orders.push({
        a: assetId,
        b: !draft.direction.asBoolean(),
        p: (draft.tpSlPlan.raw.take.limit ?? draft.tpSlPlan.raw.take.trigger).toString(),
        s: draft.size.toString(),
        r: true,
        t: {
          trigger: {
            isMarket: !draft.tpSlPlan.raw.take.limit,
            triggerPx: draft.tpSlPlan.raw.take.trigger.toString(),
            tpsl: 'tp',
          },
        },
      });
    }

    if (draft.tpSlPlan?.raw.stop) {
      orders.push({
        a: assetId,
        b: !draft.direction.asBoolean(),
        p: (draft.tpSlPlan.raw.stop.limit ?? draft.tpSlPlan.raw.stop.trigger).toString(),
        s: draft.size.toString(),
        r: true,
        t: {
          trigger: {
            isMarket: !draft.tpSlPlan.raw.stop.limit,
            triggerPx: draft.tpSlPlan.raw.stop.trigger.toString(),
            tpsl: 'sl',
          },
        },
      });
    }

    return {
      orders,
      grouping: 'na',
    };
  }
}
