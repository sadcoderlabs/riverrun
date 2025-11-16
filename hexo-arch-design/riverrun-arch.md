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
    - builderFee/
      - config/
        - builderFeeConfig.ts
      - application/
        - ports/
          - BuilderFeeExchangePort.ts
          - BuilderFeeConfirmationPort.ts
          - BuilderFeeStatePort.ts
          - WalletPort.ts
        - usecases/
          - EnsureBuilderFeeApprovalUseCase.ts
        - services/
          - BuilderFeeApprovalAdapter.ts
  - infra/ # 對外 adapter，實作 ports
    - hyperliquid/
      - HyperliquidExchangeGateway.ts

  - app-internal/ # App 專用 glue code & UI 邏輯
    - features/
      - di/
        - container.ts # 組裝 Contexts + infra
        - AppServicesProvider.tsx
      - builderFee/
        - hooks/
          - useBuilderFeeApproval.ts
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
- `builderFee/`：負責 builder fee approval 狀態管理與 Hyperliquid approval 流程，提供 usecase + adapter 供 order context 注入。

## BuilderFee bounded context

- 負責確認/更新 Hyperliquid builder fee allowance，對外提供 `BuilderFeeApprovalPort` 的實作。
- 透過 `WalletPort` 取得當前 signer、`BuilderFeeExchangePort` 讀寫 builder fee、`BuilderFeeConfirmationPort` 確認 UI、`BuilderFeeStatePort` 更新 UI 狀態。
- 提供 `EnsureBuilderFeeApprovalUseCase`（檢查、提示、執行 approval）與 `BuilderFeeApprovalAdapter`（實作 order context 所需的 port）。

### Sample

- 在 `hexo-arch-design/arch-emulator/` 中建立了一份對應的目錄樹與範例程式碼，可直接對照此文件理解各層互動方式。

# 檔案範例

```ts
// app-internal/features/di/container.ts

import { createContainer, asValue, asFunction } from 'awilix';

export function createAppContainer(deps: {
  exchangePort: OrderExchangePort;
  telemetryPort: OrderTelemetryPort;
  builderFeePort?: BuilderFeeApprovalPort;
  builderFeeDeps?: BuilderFeeDeps;
}) {
  const container = createContainer();
  container.register({
    exchangePort: asValue(deps.exchangePort),
    telemetryPort: asValue(deps.telemetryPort),
  });

  if (deps.builderFeePort) {
    container.register({ builderFeePort: asValue(deps.builderFeePort) });
  } else if (deps.builderFeeDeps) {
    container.register({
      walletPort: asValue(deps.builderFeeDeps.walletPort),
      builderFeeExchangePort: asValue(deps.builderFeeDeps.builderFeeExchangePort),
      builderFeeConfirmationPort: asValue(deps.builderFeeDeps.builderFeeConfirmationPort),
      builderFeeStatePort: asValue(deps.builderFeeDeps.builderFeeStatePort),
      ensureBuilderFeeApprovalUseCase: asFunction(/* ... */).singleton(),
      builderFeePort: asFunction(
        ({ ensureBuilderFeeApprovalUseCase }) =>
          new BuilderFeeApprovalAdapter(ensureBuilderFeeApprovalUseCase),
      ).singleton(),
    });
  }

  container.register({
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
import type { OrderExchangePort, OrderExchangeResult } from '../ports/OrderExchangePort';
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
```

```ts
// infra/hyperliquid/HyperliquidExchangeGateway.ts

import * as hl from '@nktkas/hyperliquid';
import type { OrderParameters } from '@nktkas/hyperliquid/api/exchange';
import type { Signer } from 'ethers';
import type {
  OrderExchangePort,
  OrderExchangeResult,
  OrderCancelRequest,
} from '@/contexts/order/application/ports/OrderExchangePort';

export class HyperliquidExchangeGateway implements OrderExchangePort {
  private readonly transport: hl.HttpTransport;
  private readonly clients = new Map<string, hl.ExchangeClient>();

  constructor(transport?: hl.HttpTransport) {
    this.transport = transport ?? new hl.HttpTransport();
  }

  async order(signer: Signer, request: OrderParameters): Promise<OrderExchangeResult> {
    const client = this.getClient(signer);
    const res = await client.order(request);
    const first = res.response.data.statuses[0];

    if ('error' in first) {
      return { status: 'rejected', rejectReason: first.error };
    }

    const resting = 'resting' in first ? first.resting : undefined;
    const filled = 'filled' in first ? first.filled : undefined;

    return {
      status: 'accepted',
      orderId: (resting?.oid ?? filled?.oid)?.toString(),
      clientOrderId: resting?.cloid ?? filled?.cloid,
    };
  }

  async cancel(signer: Signer, request: OrderCancelRequest): Promise<OrderExchangeResult> {
    const client = this.getClient(signer);
    await client.cancel({ cloids: request.clientOrderIds });
    return { status: 'accepted' };
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
import { useContainer } from '@/app-internal/features/di/AppServicesProvider';
import { mapFormToCommand } from '../viewModels/orderFormMapper';
import type { OrderExchangeResult } from '@/contexts/order/application/ports/OrderExchangePort';

export function usePlaceOrder(signer: Signer) {
  const placeOrderUseCase = useContainer(container => container.resolve('placeOrderUseCase'));
  const [lastResult, setLastResult] = useState<OrderExchangeResult | undefined>();
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

```ts
// contexts/builderFee/config/builderFeeConfig.ts

export const BUILDER_FEE_CONFIG = {
  builderAddress: '0xBuilderContract',
  requiredFeeRateBps: 5,
  maxFeeRateBps: 50,
};
```

```ts
// contexts/builderFee/application/ports/BuilderFeeExchangePort.ts

import type { Signer } from 'ethers';

export interface BuilderFeeExchangePort {
  getMaxFeeBps(walletAddress: string, builderAddress: string): Promise<number>;
  approveFee(params: {
    signer: Signer;
    builderAddress: string;
    maxFeeRateBps: number;
  }): Promise<void>;
}
```

```ts
// contexts/builderFee/application/usecases/EnsureBuilderFeeApprovalUseCase.ts

import { BUILDER_FEE_CONFIG } from '../../config/builderFeeConfig';

export class EnsureBuilderFeeApprovalUseCase {
  constructor(
    private readonly wallet: WalletPort,
    private readonly exchange: BuilderFeeExchangePort,
    private readonly confirmation: BuilderFeeConfirmationPort,
    private readonly state: BuilderFeeStatePort,
  ) {}

  private async refreshStatus(address: string) {
    const maxFee = await this.exchange.getMaxFeeBps(address, BUILDER_FEE_CONFIG.builderAddress);
    const status = {
      isApproved: maxFee >= BUILDER_FEE_CONFIG.requiredFeeRateBps,
      maxApprovedFeeBps: maxFee,
    };
    this.state.updateStatus(status);
    return status;
  }

  async execute() {
    const active = await this.wallet.getActiveWallet();
    if (!active) {
      const status = { isApproved: false, maxApprovedFeeBps: 0 };
      this.state.updateStatus(status);
      return status;
    }

    const status = await this.refreshStatus(active.address);
    if (status.isApproved) return status;

    const confirmed = await this.confirmation.confirmApproval({
      requiredFeeRateBps: BUILDER_FEE_CONFIG.requiredFeeRateBps,
    });
    if (!confirmed) return status;

    await this.exchange.approveFee({
      signer: active.signer,
      builderAddress: BUILDER_FEE_CONFIG.builderAddress,
      maxFeeRateBps: BUILDER_FEE_CONFIG.maxFeeRateBps,
    });

    return this.refreshStatus(active.address);
  }
}
```

```ts
// contexts/builderFee/application/services/BuilderFeeApprovalAdapter.ts

import type { BuilderFeeApprovalPort } from '@/contexts/order/application/ports/BuilderFeeApprovalPort';

export class BuilderFeeApprovalAdapter implements BuilderFeeApprovalPort {
  constructor(private readonly ensureUseCase: EnsureBuilderFeeApprovalUseCase) {}

  async ensureApproved(): Promise<void> {
    const status = await this.ensureUseCase.execute();
    if (!status.isApproved) {
      throw new Error('Builder fee approval rejected by user');
    }
  }
}
```

```ts
// app-internal/features/builderFee/hooks/useBuilderFeeApproval.ts

import { useCallback, useState } from 'react';
import { useContainer } from '@/app-internal/features/di/AppServicesProvider';

export function useBuilderFeeApproval() {
  const ensureUseCase = useContainer(container =>
    container.resolve('ensureBuilderFeeApprovalUseCase'),
  );
  const [status, setStatus] = useState<BuilderFeeStatus | undefined>();
  const [isLoading, setLoading] = useState(false);

  const ensureApproval = useCallback(async () => {
    setLoading(true);
    try {
      const next = await ensureUseCase.execute();
      setStatus(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [ensureUseCase]);

  return { status, isLoading, ensureApproval };
}
```
