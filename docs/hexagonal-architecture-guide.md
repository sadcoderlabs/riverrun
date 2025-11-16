# Hexagonal Architecture Development Guide

**最後更新：** 2025-11-17
**適用範圍：** Contexts 和 App-Internal 開發

本文檔記錄了 Riverrun 專案採用的 Hexagonal Architecture (Clean Architecture) 設計模式、核心原則、以及實戰經驗。

---

## 目錄

1. [架構概覽](#架構概覽)
2. [核心設計原則](#核心設計原則)
3. [Context 開發指南](#context-開發指南)
4. [UseCase Pattern](#usecase-pattern)
5. [Ports and Adapters](#ports-and-adapters)
6. [狀態管理策略](#狀態管理策略)
7. [依賴注入 (DI)](#依賴注入-di)
8. [React Hooks Layer](#react-hooks-layer)
9. [重構清單與模板](#重構清單與模板)
10. [常見陷阱與解決方案](#常見陷阱與解決方案)

---

## 架構概覽

### 分層結構

```
riverrun/
├── contexts/                    # 核心業務邏輯層 (Hexagonal Architecture)
│   └── {contextName}/
│       ├── application/         # Application Layer
│       │   ├── ports/          # Out Ports (介面)
│       │   │   └── XxxPort.ts
│       │   └── usecases/       # Use Cases (業務邏輯)
│       │       └── XxxUseCase.ts
│       ├── adapters/           # Adapters (實作)
│       │   └── XxxAdapter.ts
│       └── ports/              # Domain Types
│           └── types.ts        # Pure functions & types
│
├── app-internal/               # UI Layer (React)
│   ├── di/                     # Dependency Injection
│   │   ├── container.ts        # DI Container 註冊
│   │   └── types.ts            # Type definitions
│   └── features/
│       └── {featureName}/
│           └── hooks/          # React Hooks (UI 層)
│               ├── useXxx.ts           # Operations + State
│               ├── useXxxStore.ts      # Zustand (如需要)
│               └── useXxxSubscription.ts  # WebSocket (如需要)
│
└── infra/                      # Infrastructure Layer
    └── hyperliquid/
        └── hyperliquidGateway.ts  # 實作 Out Ports
```

### 依賴方向

```
UI Layer (React Hooks)
    ↓ depends on
Application Layer (UseCases, Ports)
    ↓ depends on
Infrastructure Layer (Gateway, Adapters)
```

**關鍵原則：依賴方向永遠向內（從外到內）**

---

## 核心設計原則

### 1. 單一職責原則 (Single Responsibility Principle)

**每個 UseCase 只做一件事**

❌ **錯誤範例：組合邏輯在 UseCase**
```typescript
// ❌ EnsureApprovalUseCase - 做太多事
class EnsureApprovalUseCase {
  async execute() {
    // 1. 檢查狀態
    // 2. 如果未審批 → 執行審批
    // 3. 返回結果
  }
}
```

✅ **正確範例：單一職責 + 使用端組合**
```typescript
// ✅ GetStatusUseCase - 只負責查詢
class GetStatusUseCase {
  async execute() {
    return await this.port.getStatus();
  }
}

// ✅ ApproveUseCase - 只負責審批
class ApproveUseCase {
  async execute() {
    return await this.port.approve();
  }
}

// ✅ 組合邏輯在使用端 (Hook 或高層 UseCase)
function useFeature() {
  const getStatus = useContainer(c => c.getStatusUseCase);
  const approve = useContainer(c => c.approveUseCase);

  async function ensure() {
    const status = await getStatus.execute();
    if (!status.isApproved) {
      await approve.execute();
    }
  }
}
```

**例外：組合 UseCase**

當需要跨 Context 使用時，可以創建**組合 UseCase**：

```typescript
// ✅ TryGetAgentWalletUseCase - 組合 UseCase（供跨 Context 使用）
export class TryGetAgentWalletUseCase {
  constructor(
    private readonly getOrCreate: GetOrCreateAgentWalletUseCase,
    private readonly getStatus: GetAgentStatusUseCase,
    private readonly approve: ApproveAgentUseCase,
  ) {}

  async execute(): Promise<Result> {
    // 組合細粒度 UseCases
    // 簡化跨 Context 調用
  }
}
```

---

### 2. 依賴倒置原則 (Dependency Inversion Principle)

**Application Layer 定義介面，Infrastructure Layer 實作**

```typescript
// ✅ Application Layer 定義 Port
export interface OrderExchangePort {
  placeOrder(signer: Signer, request: OrderRequest): Promise<OrderResponse>;
}

// ✅ UseCase 依賴抽象（Port）
export class PlaceOrderUseCase {
  constructor(
    private readonly orderExchange: OrderExchangePort  // 依賴介面
  ) {}
}

// ✅ Infrastructure Layer 實作 Port
export class HyperliquidGateway implements OrderExchangePort {
  async placeOrder(signer: Signer, request: OrderRequest) {
    // 實作細節
  }
}
```

**好處：**
- UseCase 不依賴具體實作
- 可測試（mock Port）
- 可替換實作（不影響業務邏輯）

---

### 3. Port 介面一致性

**所有 Port 方法遵循相同模式：Signer + Parameters**

```typescript
// ✅ 一致的 Port 介面設計
interface BuilderFeeExchangePort {
  approveBuilderFee(signer: Signer, maxFeeRate: string, builderAddress: string): Promise<void>;
}

interface ReferralExchangePort {
  setReferrer(signer: Signer, code: string): Promise<void>;
}

interface MarginExchangePort {
  updateLeverage(signer: Signer, params: { asset: number; isCross: boolean; leverage: number }): Promise<void>;
}

interface OrderExchangePort {
  placeOrder(signer: Signer, request: OrderRequest): Promise<OrderResponse>;
  cancelOrders(signer: Signer, request: CancelRequest): Promise<void>;
}
```

**模式：**
1. **第一個參數永遠是 `signer: Signer`**
2. 其他參數可以是單獨參數或結構化的 `params` 物件
3. Gateway 內部負責創建 client（不由 UseCase 創建）

---

### 4. Wallet 角色分離

**關鍵原則：主 Wallet vs Agent Wallet**

```typescript
// ✅ 正確的 Wallet 使用
export class PlaceOrderUseCase {
  async execute(params: PlaceOrderParams): Promise<OrderResult> {
    // 1. 使用主 Wallet approve BuilderFee
    const masterWallet = await this.walletPort.active();
    const masterSigner = await this.walletPort.getSigner();
    const feeResult = await this.ensureBuilderFee.execute({
      signer: masterSigner,  // ✅ 主 Wallet
      walletAddress: masterWallet.address,
    });

    // 2. 使用 Agent Wallet 下單
    const { agentWallet } = await this.tryGetAgentWallet.execute();
    const response = await this.orderExchange.placeOrder(
      agentWallet.signer,  // ✅ Agent Wallet
      { orders, grouping, builder }
    );
  }
}
```

**原則：**
- **BuilderFee Approval** → 必須使用**主 Wallet**
- **Agent Approval** → 必須使用**主 Wallet**
- **訂單操作** → 使用 **Agent Wallet**（已被主 Wallet 授權）
- **Margin 操作** → 使用 **Agent Wallet**

---

## Context 開發指南

### Context 的職責邊界

**一個 Context = 一個業務領域**

| Context | 職責 | 主要 UseCases |
|---------|------|--------------|
| **BuilderFee** | 手續費管理 | Get/Approve/Revoke/Ensure |
| **Referral** | 推薦碼管理 | Get/Set |
| **Bridge** | 跨鏈橋接 | Deposit/Withdraw/GetBalance |
| **Agent** | Agent Wallet 管理 | Get/Approve/Revoke/TryGet |
| **Margin** | 保證金槓桿 | SetLeverage |
| **Order** | 訂單管理 | Place/Close/TpSl/Cancel |

### Context 目錄結構

```
contexts/{contextName}/
├── application/
│   ├── ports/                    # Out Ports (介面)
│   │   ├── XxxExchangePort.ts   # 交易所操作介面
│   │   ├── XxxStoragePort.ts    # 存儲介面（如需要）
│   │   └── XxxConfirmationPort.ts  # 確認介面（如需要）
│   └── usecases/                 # Use Cases
│       ├── GetXxxUseCase.ts     # Query
│       ├── CreateXxxUseCase.ts  # Command
│       └── TryGetXxxUseCase.ts  # Composition（如需要）
├── adapters/                     # Adapters
│   ├── xxxStore.ts              # Zustand Store（如需要）
│   └── xxxAdapter.ts            # Port 實作（如需要）
├── ports/
│   └── types.ts                 # Domain Types + Pure Functions
└── config.ts                    # 配置（如需要）
```

---

## UseCase Pattern

### UseCase 標準結構

```typescript
/**
 * XxxUseCase
 *
 * 職責：執行 XXX 操作
 *
 * Dependencies:
 * - Port1: 描述
 * - Port2: 描述
 */

import type { Port1 } from '../ports/Port1';
import type { Port2 } from '../ports/Port2';
import type { XxxParams, XxxResult } from '../../ports/types';

export class XxxUseCase {
  constructor(
    private readonly port1: Port1,
    private readonly port2: Port2,
  ) {}

  async execute(params: XxxParams): Promise<XxxResult> {
    try {
      // 1. 驗證參數

      // 2. 獲取依賴資源

      // 3. 執行業務邏輯

      // 4. 返回結果
      return { success: true };
    } catch (error) {
      console.error('[XxxUseCase] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute',
      };
    }
  }
}
```

### Command vs Query

**Command (寫操作):**
```typescript
// Command: 改變狀態
export class ApproveBuilderFeeUseCase {
  async execute(params: ApproveCommand): Promise<Result> {
    // 執行審批，改變區塊鏈狀態
  }
}
```

**Query (讀操作):**
```typescript
// Query: 不改變狀態
export class GetBuilderFeeStatusUseCase {
  async execute(params: GetCommand): Promise<Status> {
    // 查詢狀態，不改變任何東西
  }
}
```

---

## Ports and Adapters

### Port 實作策略

#### 策略 1: Gateway 直接實作（推薦）

**適用情況：**
- Gateway 已有對應方法
- 方法簽名一致
- 無需額外轉換邏輯

```typescript
// ✅ Port 定義
export interface BuilderFeeExchangePort {
  approveBuilderFee(signer: Signer, maxFeeRate: string, builderAddress: string): Promise<void>;
}

// ✅ Gateway 直接實作
export class HyperliquidGateway implements BuilderFeeExchangePort {
  async approveBuilderFee(signer: Signer, maxFeeRate: string, builderAddress: string) {
    // 直接實作
  }
}

// ✅ DI 註冊
container.register({
  builderFeeExchangePort: asFunction(({ hyperliquidGateway }) => {
    return hyperliquidGateway;  // 直接返回 Gateway
  }).singleton(),
});
```

#### 策略 2: 使用 Adapter

**適用情況：**
- 需要複雜適配邏輯
- Gateway 與 Port 介面差異大
- 需要組合多個 Gateway 方法

```typescript
// ✅ Port 定義
export interface ArbitrumBridgePort {
  deposit(signer: Signer, amount: string): Promise<void>;
}

// ✅ Adapter 實作
export class ArbitrumBridgeAdapter implements ArbitrumBridgePort {
  constructor(private readonly gateway: SomeGateway) {}

  async deposit(signer: Signer, amount: string) {
    // 適配邏輯：處理 Privy vs External wallet 差異
    // 組合多個 Gateway 方法
  }
}

// ✅ DI 註冊
container.register({
  arbitrumBridgePort: asFunction(({ someGateway }) => {
    return new ArbitrumBridgeAdapter(someGateway);
  }).singleton(),
});
```

### Confirmation Port

**需要 Confirmation Port 的情況：**

```typescript
// ✅ 需要：多個 Context 使用相同確認邏輯
export interface BuilderFeeConfirmationPort {
  requestApproval(params: ApprovalParams): Promise<boolean>;
}

// ✅ UI Adapter 實作
export class AlertBuilderFeeApprovalConfirmationAdapter implements BuilderFeeConfirmationPort {
  async requestApproval(params: ApprovalParams): Promise<boolean> {
    // 顯示 Alert 對話框
    // 處理 wallet type 差異
  }
}

// ✅ UseCase 使用
export class ApproveBuilderFeeUseCase {
  constructor(
    private readonly exchange: BuilderFeeExchangePort,
    private readonly confirmation: BuilderFeeConfirmationPort  // 注入 Port
  ) {}

  async execute(params: ApproveCommand): Promise<Result> {
    // 請求用戶確認
    const confirmed = await this.confirmation.requestApproval(params);
    if (!confirmed) return { success: false };

    // 執行審批
    await this.exchange.approveBuilderFee(...);
  }
}
```

**不需要 Confirmation Port 的情況：**

```typescript
// ✅ 不需要：確認邏輯簡單，在 UI 層處理
export function useReferral() {
  const setReferrer = useContainer(c => c.setReferrerUseCase);

  async function handleSetReferrer(code: string) {
    // UI 層處理確認
    const confirmed = await showConfirmDialog();
    if (!confirmed) return;

    // 調用 UseCase
    await setReferrer.execute({ code });
  }
}
```

---

## 狀態管理策略

### 決策樹

```
是否需要狀態管理？
├─ 需要 WebSocket 實時更新？
│  └─ 是 → Zustand Store (全局響應式)
│      範例：Order, Position, History, Margin
│
└─ 否 → 分析使用端
   ├─ 多個組件需要即時同步狀態？
   │  └─ 是 → Zustand Store
   │
   └─ 否 → useState (本地狀態)
       範例：BuilderFee, Referral, Bridge, Agent
```

### 模式 1: useState (本地狀態)

**適用情況：**
- 單一使用端
- 狀態不需要跨組件共享
- 按需調用 API（非實時訂閱）

```typescript
// ✅ Hook 管理本地狀態
export function useBuilderFee() {
  const getStatus = useContainer(c => c.getBuilderFeeStatusUseCase);
  const approve = useContainer(c => c.approveBuilderFeeUseCase);

  // 本地狀態
  const [maxApprovedFee, setMaxApprovedFee] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    const result = await getStatus.execute({ walletAddress });
    setMaxApprovedFee(result.maxApprovedFee);
    setIsLoading(false);
  }, [getStatus]);

  return {
    maxApprovedFee,
    isLoading,
    checkStatus,
    approveBuilderFee: async () => { ... },
  };
}
```

### 模式 2: Zustand Store (全局狀態)

**適用情況：**
- WebSocket 實時訂閱
- 多個組件需要響應式訂閱同一狀態

```typescript
// ✅ Zustand Store 定義
export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],
  isLoading: false,
  setOrders: (orders) => set({ orders }),
  clear: () => set({ orders: [], isLoading: false }),
}));

// ✅ Subscription Hook 更新 Store
export function useOrderSubscription() {
  const wallet = useStore(activeWalletStore, state => state.wallet);
  const gateway = useMemo(() => new HyperliquidGateway(), []);

  useEffect(() => {
    if (!wallet) return;

    let subscription: SubscriptionHandle | undefined;
    let isCancelled = false;

    (async () => {
      subscription = await gateway.subscribeOrders(
        { user: wallet.address },
        (data) => {
          if (!isCancelled) {
            // 更新全局 Store
            useOrderStore.getState().setOrders(data.orders);
          }
        }
      );
    })();

    return () => {
      isCancelled = true;
      subscription?.unsubscribe();
    };
  }, [wallet, gateway]);
}

// ✅ 組件訂閱 Store
export function OrderList() {
  const orders = useOrderStore(state => state.orders);  // 響應式訂閱
  // ...
}
```

### 狀態管理經驗總結

| Context | 使用端數量 | 決策 | 原因 |
|---------|-----------|------|------|
| **BuilderFee** | 1 個 | useState | 單一使用端，按需調用 |
| **Referral** | 1 個 | useState | 單一使用端，按需調用 |
| **Bridge** | 2 個（獨立） | useState | 使用端各自獨立，無共享需求 |
| **Agent** | 3 個（獨立） | useState | 按需調用，無即時同步需求 |
| **Margin** | 多個 | Zustand | WebSocket 實時訂閱 |
| **Order** | 多個 | Zustand | WebSocket 實時訂閱 |
| **Position** | 多個 | Zustand | WebSocket 實時訂閱 |
| **History** | 多個 | Zustand | WebSocket 實時訂閱 |

**教訓：不只看使用端數量，更要分析是否需要即時同步狀態**

---

## 依賴注入 (DI)

### DI Container 結構

```typescript
// app-internal/di/container.ts
export function createContainer(options: CreateContainerOptions): AppContainer {
  const container = createContainer<AppCradle>({ injectionMode: InjectionMode.PROXY });

  // 1. 註冊 Infrastructure
  container.register({
    hyperliquidGateway: asFunction(() => new HyperliquidGateway()).singleton(),
  });

  // 2. 註冊 Out Ports
  container.register({
    xxxExchangePort: asFunction(({ hyperliquidGateway }) => {
      return hyperliquidGateway;  // Gateway 直接實作
    }).singleton(),
  });

  // 3. 註冊 UseCases
  container.register({
    xxxUseCase: asFunction(({ xxxExchangePort, otherPort }) => {
      return new XxxUseCase(xxxExchangePort, otherPort);
    }).singleton(),
  });

  return container;
}
```

### DI 註冊模式

```typescript
// ✅ 標準 UseCase 註冊
container.register({
  placeOrderUseCase: asFunction(
    ({
      orderExchangePort,
      tryGetAgentWalletUseCase,
      ensureBuilderFeeUseCase,
      marketService,
      walletService,
    }) => {
      return new PlaceOrderUseCase(
        orderExchangePort,
        tryGetAgentWalletUseCase,
        ensureBuilderFeeUseCase,
        marketService,
        walletService,
      );
    },
  ).singleton(),
});
```

### Type Safety

```typescript
// app-internal/di/types.ts
export interface AppCradle {
  // Infrastructure
  hyperliquidGateway: HyperliquidGateway;

  // Core Services
  walletService: WalletPort;
  marketService: MarketPort;

  // Context - Out Ports
  orderExchangePort: OrderExchangePort;

  // Context - UseCases
  placeOrderUseCase: PlaceOrderUseCase;
  cancelOrderUseCase: CancelOrderUseCase;
}

export type AppContainer = AwilixContainer<AppCradle>;
```

---

## React Hooks Layer

### Hook 的職責

**Hook 只負責 UI 層邏輯：**
1. 調用 UseCases
2. 管理 UI 狀態（loading, error）
3. 顯示 Toast 通知
4. 組合多個 UseCases（如需要）

**Hook 不應該：**
- ❌ 包含業務邏輯
- ❌ 直接調用 Gateway
- ❌ 處理區塊鏈邏輯

### 標準 Hook 結構

```typescript
/**
 * useXxx - Business operations hook
 *
 * Provides operations with UI integration:
 * - Loading states for UI feedback
 * - Toast notifications for success/failure
 * - Error state management
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner-native';
import { useContainer } from '@/app-internal/di';

export function useXxx() {
  // 1. 從 DI Container 獲取 UseCases
  const xxxUseCase = useContainer(c => c.xxxUseCase);

  // 2. UI 狀態
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // 3. 操作方法
  const doSomething = useCallback(
    async (params: XxxParams): Promise<boolean> => {
      setIsLoading(true);
      setError(undefined);

      try {
        const result = await xxxUseCase.execute(params);

        if (result.success) {
          toast.success('Success', { description: 'Operation completed' });
          return true;
        } else {
          setError(result.error);
          toast.error('Failed', { description: result.error });
          return false;
        }
      } finally {
        setIsLoading(false);
      }
    },
    [xxxUseCase],
  );

  // 4. 返回
  return {
    doSomething,
    isLoading,
    error,
  };
}
```

### WebSocket Subscription Hook

```typescript
/**
 * useXxxSubscription - WebSocket subscription hook
 *
 * Manages real-time data subscription and updates global store
 */

export function useXxxSubscription() {
  const wallet = useStore(activeWalletStore, state => state.wallet);
  const gateway = useMemo(() => new HyperliquidGateway(), []);

  useEffect(() => {
    if (!wallet) {
      useXxxStore.getState().clear();
      return;
    }

    let subscription: SubscriptionHandle | undefined;
    let isCancelled = false;  // Race condition 保護

    (async () => {
      subscription = await gateway.subscribeXxx(
        { user: wallet.address },
        (data) => {
          if (!isCancelled) {  // 檢查是否已 unmount
            useXxxStore.getState().setXxx(data);
          }
        }
      );
    })();

    return () => {
      isCancelled = true;
      subscription?.unsubscribe();
    };
  }, [wallet, gateway]);
}
```

---

## 重構清單與模板

### 重構前檢查清單

- [ ] 讀取現有 Service 實作
- [ ] 識別所有業務操作（Commands vs Queries）
- [ ] 確定外部依賴（需要哪些 Out Ports）
- [ ] 檢查 Gateway 是否已有實作
- [ ] 決定是否需要跨 Context 使用
- [ ] 分析狀態管理需求（WebSocket? 使用端數量?）
- [ ] 決定是否需要 Confirmation Port

### 重構步驟模板

#### Step 1: 創建 Command Types

```typescript
// contexts/xxx/ports/types.ts

export interface XxxParams {
  // 參數定義
}

export interface XxxResult {
  success: boolean;
  error?: string;
}
```

#### Step 2: 創建 Out Ports

```typescript
// contexts/xxx/application/ports/XxxExchangePort.ts

import type { Signer } from 'ethers';

export interface XxxExchangePort {
  doSomething(signer: Signer, params: XxxParams): Promise<void>;
}
```

#### Step 3: 創建 UseCases

```typescript
// contexts/xxx/application/usecases/DoSomethingUseCase.ts

import type { XxxExchangePort } from '../ports/XxxExchangePort';
import type { XxxParams, XxxResult } from '../../ports/types';

export class DoSomethingUseCase {
  constructor(
    private readonly exchange: XxxExchangePort,
  ) {}

  async execute(params: XxxParams): Promise<XxxResult> {
    try {
      await this.exchange.doSomething(params.signer, params);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed',
      };
    }
  }
}
```

#### Step 4: 實作 Port (Gateway or Adapter)

```typescript
// infra/hyperliquid/hyperliquidGateway.ts

export class HyperliquidGateway implements XxxExchangePort {
  async doSomething(signer: Signer, params: XxxParams): Promise<void> {
    const client = this.getAgentExchangeClient(signer);
    await client.doSomething(params);
  }
}
```

#### Step 5: 更新 DI Container

```typescript
// app-internal/di/container.ts

import { DoSomethingUseCase } from '@/contexts/xxx/application/usecases/DoSomethingUseCase';

container.register({
  // Port
  xxxExchangePort: asFunction(({ hyperliquidGateway }) => {
    return hyperliquidGateway;
  }).singleton(),

  // UseCase
  doSomethingUseCase: asFunction(({ xxxExchangePort }) => {
    return new DoSomethingUseCase(xxxExchangePort);
  }).singleton(),
});

// app-internal/di/types.ts

import type { XxxExchangePort } from '@/contexts/xxx/application/ports/XxxExchangePort';
import type { DoSomethingUseCase } from '@/contexts/xxx/application/usecases/DoSomethingUseCase';

export interface AppCradle {
  xxxExchangePort: XxxExchangePort;
  doSomethingUseCase: DoSomethingUseCase;
}
```

#### Step 6: 創建或更新 Hook

```typescript
// app-internal/features/xxx/hooks/useXxx.ts

export function useXxx() {
  const doSomething = useContainer(c => c.doSomethingUseCase);
  const [isLoading, setIsLoading] = useState(false);

  const handleDoSomething = useCallback(async (params: XxxParams) => {
    setIsLoading(true);
    try {
      const result = await doSomething.execute(params);
      if (result.success) {
        toast.success('Success');
        return true;
      } else {
        toast.error(result.error);
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  }, [doSomething]);

  return { handleDoSomething, isLoading };
}
```

#### Step 7: 刪除舊檔案

```bash
rm contexts/xxx/application/xxxService.ts
rm contexts/xxx/ports/xxxPort.ts  # In Port
```

#### Step 8: 編譯檢查 + 格式化

```bash
npx tsc --noEmit
npx prettier --write "contexts/xxx/**/*.ts" "app-internal/**/*.ts"
```

---

## 常見陷阱與解決方案

### 陷阱 1: UseCase 包含太多職責

❌ **錯誤：**
```typescript
class PlaceOrderUseCase {
  async execute(params: PlaceOrderParams) {
    // 1. 檢查 BuilderFee
    // 2. 如果沒審批 → 審批
    // 3. 檢查 Agent
    // 4. 如果沒 Agent → 創建 + 審批
    // 5. 下單
    // ❌ 做太多事了！
  }
}
```

✅ **解決方案：拆分 + 組合**
```typescript
// ✅ 每個 UseCase 單一職責
class PlaceOrderUseCase {
  constructor(
    private readonly ensureBuilderFee: EnsureBuilderFeeUseCase,  // 組合
    private readonly tryGetAgentWallet: TryGetAgentWalletUseCase,  // 組合
    private readonly orderExchange: OrderExchangePort,
  ) {}

  async execute(params: PlaceOrderParams) {
    // 使用組合 UseCase
    const feeResult = await this.ensureBuilderFee.execute(...);
    const { agentWallet } = await this.tryGetAgentWallet.execute();

    // 專注於下單邏輯
    await this.orderExchange.placeOrder(...);
  }
}
```

### 陷阱 2: Wallet 角色混淆

❌ **錯誤：使用 Agent Wallet approve BuilderFee**
```typescript
const { agentWallet } = await this.tryGetAgentWallet.execute();
await this.ensureBuilderFee.execute({
  signer: agentWallet.signer,  // ❌ 錯誤！
});
```

✅ **解決方案：分離 Wallet 角色**
```typescript
// 1. 主 Wallet approve BuilderFee
const masterWallet = await this.walletPort.active();
const masterSigner = await this.walletPort.getSigner();
await this.ensureBuilderFee.execute({
  signer: masterSigner,  // ✅ 主 Wallet
});

// 2. Agent Wallet 下單
const { agentWallet } = await this.tryGetAgentWallet.execute();
await this.orderExchange.placeOrder(
  agentWallet.signer,  // ✅ Agent Wallet
);
```

### 陷阱 3: Port 介面不一致

❌ **錯誤：需要外部創建 client**
```typescript
interface MarginExchangePort {
  getClient(signer: Signer): ExchangeClient;
  updateLeverage(client: ExchangeClient, params: Params): Promise<void>;
}

// UseCase 需要手動創建 client
const client = this.exchange.getClient(signer);  // ❌ 麻煩
await this.exchange.updateLeverage(client, params);
```

✅ **解決方案：Port 內部處理 client**
```typescript
interface MarginExchangePort {
  updateLeverage(signer: Signer, params: Params): Promise<void>;
}

// Gateway 內部處理
async updateLeverage(signer: Signer, params: Params) {
  const client = this.getAgentExchangeClient(signer);  // ✅ 內部處理
  await client.updateLeverage(params);
}
```

### 陷阱 4: 過度使用 Zustand Store

❌ **錯誤：單一使用端也用 Zustand**
```typescript
// ❌ BuilderFee 只有一個使用端，卻用 Zustand
export const useBuilderFeeStore = create<BuilderFeeStore>(...);

export function useBuilderFee() {
  const store = useBuilderFeeStore();
  // ...
}
```

✅ **解決方案：使用 useState**
```typescript
// ✅ 單一使用端，使用 useState
export function useBuilderFee() {
  const [maxApprovedFee, setMaxApprovedFee] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  // ...
}
```

### 陷阱 5: WebSocket Subscription 缺少 Race Condition 保護

❌ **錯誤：沒有 isCancelled 檢查**
```typescript
useEffect(() => {
  let subscription: SubscriptionHandle | undefined;

  (async () => {
    subscription = await gateway.subscribe(
      params,
      (data) => {
        // ❌ 沒有檢查是否已 unmount
        useStore.getState().setData(data);
      }
    );
  })();

  return () => {
    subscription?.unsubscribe();
  };
}, []);
```

✅ **解決方案：添加 isCancelled 保護**
```typescript
useEffect(() => {
  let subscription: SubscriptionHandle | undefined;
  let isCancelled = false;  // ✅ Race condition 保護

  (async () => {
    subscription = await gateway.subscribe(
      params,
      (data) => {
        if (!isCancelled) {  // ✅ 檢查
          useStore.getState().setData(data);
        }
      }
    );
  })();

  return () => {
    isCancelled = true;  // ✅ 設置 flag
    subscription?.unsubscribe();
  };
}, []);
```

---

## 總結

### 架構優勢

1. **單一職責** - 每個 UseCase 只做一件事
2. **可測試** - 所有業務邏輯可獨立測試
3. **可維護** - 清晰的層次分離
4. **可替換** - 依賴介面而非實作
5. **一致性** - 統一的模式和命名

### 關鍵原則記憶口訣

- **SRP**: 一個 UseCase 一件事
- **DIP**: 依賴介面不依賴實作
- **Signer First**: Port 方法第一個參數永遠是 Signer
- **Wallet Separation**: 主 Wallet approve，Agent Wallet 操作
- **State Strategy**: WebSocket → Zustand，按需調用 → useState
- **No Business in UI**: Hook 只負責 UI，業務邏輯在 UseCase

---

**最後更新：** 2025-11-17
**維護者：** Riverrun Team
