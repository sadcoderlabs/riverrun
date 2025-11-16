# 架構目錄樹

- riverrun/
  - app/ # Expo Router routes (純 UI)
    - \_layout.tsx
    - (tabs)/
    - trade.tsx
    - positions.tsx
    - bridge.tsx
    - ...
  - contexts/ # 核心 bounded contexts
    - order/
      - domain/ # 放輕量 domain model、value objects、rules
        - entities/
          - OrderDraft.ts
          - TpSlPlan.ts
        - valueObjects/
          - OrderSize.ts
          - OrderDirection.ts
        - services/
          - OrderRiskRules.ts
      - application/
        - usecases/
          - PlaceOrderUseCase.ts
          - PlaceCloseMarketOrderUseCase.ts
          - PlaceCloseLimitOrderUseCase.ts
          - PlaceTpSlOrdersUseCase.ts
          - CancelOrdersUseCase.ts
        - services/
          - OrderAssembler.ts
        - ports # 只放 out ports
          - OrderExchangePort.ts
          - BuilderFeeApprovalPort.ts
          - OrderTelemetryPort.ts
      - reactNative/
        - orderComposition.tsx
        - useOrderStatus.ts
        - usePlaceOrder.ts
  - infra/ # 對外 adapter，實作 ports
    - hyperliquid/
      - HyperliquidExchangeGateway.ts

  - app-internal/ # App 專用 glue code & UI 邏輯
    - features/
      - di/
        - container.ts # 組裝 Contexts + infra
        - AppServicesProvider.tsx
      - order/
        - hooks/
          - usePlaceOrder.ts
          - useCancelOrder.ts
          - useTpSlOrders.ts
        - viewModels/
          - orderFormMapper.ts
      - components/
        - Order/
        - PlaceOrderForm.tsx
        - Positions/
        - PositionsList.tsx
        - Bridge/
        - BridgeForm.tsx
      - assets/
        - ...

## Order bounded context

- 負責下單、關單、TP/SL 管理、訂單取消與交易相關遙測。
- Entry point 直接對 usecases 暴露 `execute`，outbound ports 負責串接交易所、builder fee、agent 錢包與 telemetry。
- 所有狀態資料（如 pending order、最近一次結果）都放在對應的 `reactNative` hooks 或 store 中，而不是用 usecase 儲存。

### 目錄說明

- `domain/`：放轉換/驗證時會重複使用的 value objects（size、方向、TP/SL 設定）與簡單規則（`OrderRiskRules`）。Order context 目前仍以流程為主，因此不會有 rich domain aggregate。
- `application/usecases/`：每個 usecase 都是 stateless class，注入 outbound ports 後執行一次 `execute`。
- `application/services/`：`OrderAssembler.ts` 集中 UI → port DTO 的 mapping；可視需要實作 facade/service 將多個 usecase 封裝成單一 entry。
- `application/ports/`：僅保留 outbound ports（exchange / approvals / telemetry）；Inbound 直接使用 usecases。
- `reactNative/`：放有狀態的 hooks（`useOrderStatus`、`usePlaceOrder`）與 `orderComposition.tsx`（對 React tree 提供 context）。
- `app-internal/features/di/`：`container.ts` 使用 Awilix 組裝 contexts + infra，`AppServicesProvider.tsx` 透過 container Provider 提供 React hook。
- `app-internal/features/order/`：UI glue，包含 hooks（下單、取消、管理 TP/SL）、view model mapper（`orderFormMapper.ts`）與 facade/hook 組裝（把多個 usecase 組起來給畫面使用）。

### Sample

- 在 `hexo-arch-design/arch-emulator/` 中建立了一份對應的目錄樹與範例程式碼，可直接對照此文件理解各層互動方式。

# 檔案範例

```ts
// app-internal/features/di/container.ts

import { createContainer, asValue, asFunction } from 'awilix';
import { PlaceOrderUseCase } from '@/contexts/order/application/usecases/PlaceOrderUseCase';

export function createAppContainer(deps: {
  exchangePort: OrderExchangePort;
  builderFeePort: BuilderFeeApprovalPort;
  telemetryPort: OrderTelemetryPort;
}) {
  const container = createContainer();
  container.register({
    exchangePort: asValue(deps.exchangePort),
    builderFeePort: asValue(deps.builderFeePort),
    telemetryPort: asValue(deps.telemetryPort),
    placeOrderUseCase: asFunction(
      ({ exchangePort, builderFeePort, telemetryPort }) =>
        new PlaceOrderUseCase(exchangePort, builderFeePort, telemetryPort),
    ).singleton(),
  });
  return container;
}
```

```tsx
// app-internal/features/di/AppServicesProvider.tsx

export function useContainer<T>(
  selector: (container: AppContainer) => T = c => c as unknown as T,
  deps: DependencyList = [],
) {
  const container = useAppContainer();
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  return useMemo(() => selectorRef.current(container), [container, ...deps]);
}
```

```ts
// contexts/order/application/usecases/PlaceOrderUseCase.ts

import type { Signer } from 'ethers';
import { OrderAssembler } from '../services/OrderAssembler';
import type { BuilderFeeApprovalPort } from '../ports/BuilderFeeApprovalPort';
import type { OrderExchangePort } from '../ports/OrderExchangePort';
import type { OrderTelemetryPort } from '../ports/OrderTelemetryPort';
import { OrderDraft } from '../../domain/entities/OrderDraft';

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
```

```ts
// contexts/order/domain/entities/OrderDraft.ts

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
```

```ts
// contexts/order/application/ports/OrderExchangePort.ts

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
```

```ts
// infra/hyperliquid/HyperliquidExchangeGateway.ts

import * as hl from '@nktkas/hyperliquid';
import type { OrderParameters } from '@nktkas/hyperliquid/api/exchange';
import type { Signer } from 'ethers';
import type {
  OrderExchangePort,
  OrderExecutionResponse,
  OrderCancelRequest,
} from '@/contexts/order/application/ports/OrderExchangePort';

export class HyperliquidExchangeGateway implements OrderExchangePort {
  private readonly transport: hl.HttpTransport;
  private readonly clients = new Map<string, hl.ExchangeClient>();

  constructor(transport?: hl.HttpTransport) {
    this.transport = transport ?? new hl.HttpTransport();
  }

  async order(signer: Signer, request: OrderParameters): Promise<OrderExecutionResponse> {
    const client = this.getClient(signer);
    const res = await client.order(request);
    const first = res.response.data.statuses[0];

    if ('error' in first) {
      return { ok: false, errorCode: first.error };
    }

    const resting = 'resting' in first ? first.resting : undefined;
    const filled = 'filled' in first ? first.filled : undefined;

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

  private getClient(signer: Signer) {
    const key = signer.address.toLowerCase();
    if (!this.clients.has(key)) {
      this.clients.set(key, new hl.ExchangeClient({ wallet: signer, transport: this.transport }));
    }
    return this.clients.get(key)!;
  }
}
```

```ts
// app-internal/features/order/hooks/usePlaceOrder.ts

import { useCallback, useState } from 'react';
import { useUseCase } from '@/app-internal/features/di/AppServicesProvider';
import { mapFormToCommand } from '../viewModels/orderFormMapper';
import type { OrderResult } from '@/contexts/order/application/usecases/PlaceOrderUseCase';

export function usePlaceOrder(signer: Signer) {
  const placeOrderUseCase = useUseCase(services => services.order.placeOrder);
  const [lastResult, setLastResult] = useState<OrderResult | undefined>();
  const [isSubmitting, setSubmitting] = useState(false);

  const placeOrder = useCallback(
    async (form: PlaceOrderFormValues) => {
      setSubmitting(true);
      try {
        const command = { ...mapFormToCommand(form), signer };
        const result = await placeOrderUseCase.execute(command);
        setLastResult(result);
        return result;
      } finally {
        setSubmitting(false);
      }
    },
    [placeOrderUseCase, signer],
  );

  return { placeOrder, isSubmitting, lastResult };
}
```
