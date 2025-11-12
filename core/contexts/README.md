# Core Contexts - DDD 六角架構指南

我們重構的目標是提供一個清楚簡化的六角架構，讓 AI coding agent 未來在開發或擬定開發計畫時，能夠清楚的知道要編輯哪些檔案，會有哪些影響範圍，讓未來有能力做到多個 coding agent 的平行開發。

## 核心原則

### 1. 會尖叫的架構 (Screaming Architecture)

**文件名應該直接表達其用途**，無需打開文件就能理解其職責。

```
✅ positionService.ts        - 一眼看出是 Position 的 Service
✅ usePositionStore.ts        - 一眼看出是 Position Store 的 hook
✅ webData2Repository.ts      - 一眼看出是 WebData2 的 Repository

❌ hooks.ts                   - 太通用，不知道是什麼
❌ utils.ts                   - 太抽象，需要打開才知道
❌ index.ts (作為主要邏輯)   - 只用於導出，不應包含邏輯
```

### 2. 框架獨立的業務邏輯

`core/` 目錄下的內容應該都是不相依於 React Native，可以獨立進行測試的商業邏輯。

**允許使用 Zustand Store**：

- Zustand 能夠獨立在 React Native 環境之外運作（使用 `createStore` 而非 `create`）
- Zustand 的響應式變化能夠很好的進行跨 context 的變化傳遞
- 使用 vanilla Zustand 保持框架獨立性

```typescript
// ✅ 正確：Zustand vanilla store（框架獨立）
import { createStore } from 'zustand/vanilla';

export const positionStore = createStore<PositionState>(...)

// ❌ 錯誤：React Zustand（依賴 React）
import { create } from 'zustand';
export const usePositionStore = create<PositionState>(...)
```

### 3. 依賴注入優於硬編碼

所有外部依賴應通過構造函數注入，保證可測試性和靈活性。

```typescript
// ✅ 正確：依賴注入
export class PositionService {
  constructor(
    private readonly webData2Repository: WebData2Repository,
    private readonly marketAdapter: MarketPort,
  ) {}
}

// ❌ 錯誤：硬編碼依賴
export class PositionService {
  private repository = new WebData2Repository(); // 無法替換、測試
}
```

---

## 目錄結構

### 頂層結構

```
core/
├── composition/                  # 頂層組裝
│   ├── appComposition.tsx       # 一次組合所有 contexts
│   └── index.ts                 # React Native 引用入口點
│
├── contexts/                    # Bounded Contexts（DDD）
│   ├── position/               # Position Context ⭐ 最佳實踐範例
│   ├── wallet/                 # Wallet Context（基礎服務）
│   ├── agent/                  # Agent Context
│   ├── referral/               # Referral Context
│   └── builderFee/             # BuilderFee Context
│
└── infra/                       # 基礎設施層
    └── hyperliquid/
        ├── repositories/        # Repository Pattern
        └── subscription/        # WebSocket 訂閱管理
```

### Context 標準結構

每個 context 都遵循統一的四層架構：

```
context-name/
├── ports/                       # Domain Layer - 對外接口
│   ├── xxxPort.ts              # 業務接口定義（In Port）
│   ├── types.ts                # Domain 類型和 Pure Functions
│   └── index.ts                # 統一導出
│
├── application/                 # Domain Layer - 業務邏輯
│   └── xxxService.ts           # Service 實現（Pure Business Logic）
│
├── adapters/                    # Adapter Layer - 外部依賴
│   ├── xxxStore.ts             # Zustand Store（狀態管理）
│   ├── xxxAdapter.ts           # 外部服務適配器（Out Port 實現）
│   └── index.ts                # 統一導出
│
├── reactNative/                 # React Native Layer - DI 組裝
│   ├── xxxComposition.tsx      # 依賴注入和組裝
│   ├── useXxx.ts               # Business hook（業務操作 + UI state）
│   └── useXxxStore.ts          # Store hook（狀態訪問）
│
└── config.ts (可選)             # 配置管理
```

---

## 各層詳細說明

### 1. Ports 層（Domain Layer）

**職責**：定義這個 bounded context 對外提供的業務能力

#### In Ports（對外接口）

**命名規範**：

- 文件名：`xxxPort.ts`（camelCase）
- 接口名：`XxxPort`（PascalCase）

**設計原則**：

- ✅ **保持最小化**：只暴露必要的業務方法
- ✅ **業務語言**：使用領域術語，避免技術術語
- ✅ **職責單一**：一個 Port 只關注一個業務領域
- ❌ 避免暴露內部實現細節

**範例**：

```typescript
// core/contexts/position/ports/positionPort.ts

/**
 * Position Port - 業務邏輯接口
 *
 * 這個 Port 定義了 Position Context 對外提供的業務能力。
 * 只暴露生命週期管理，數據訪問直接通過 positionStore。
 */
export interface PositionPort {
  /**
   * 啟動 Position Service
   * 開始監聽錢包變化並自動管理持倉訂閱
   */
  start(): void;

  /**
   * 停止 Position Service
   * 停止監聽並清理所有訂閱
   */
  stop(): void;
}
```

#### Domain Types 和 Pure Functions

**命名規範**：

- 文件名：`types.ts`
- 類型名：`PascalCase`
- 函數名：`camelCase`

**設計原則**：

- ✅ Pure Functions 放在 types.ts 中
- ✅ 業務邏輯函數應該是無副作用的
- ✅ 可以在任何地方使用（不依賴 React）

**範例**：

```typescript
// core/contexts/position/ports/types.ts

export type Position = hl.ClearinghouseStateResponse['assetPositions'][number]['position'];

export interface EnrichedPosition extends Position {
  markPx: string;
  szDecimals: number;
}

export interface PositionMetrics {
  funding: number;
  isFundingPositive: boolean;
  side: 'Long' | 'Short';
  isPnlPositive: boolean;
}

/**
 * 計算持倉指標
 *
 * Pure function - 可在任何地方使用，易於測試
 */
export function calculatePositionMetrics(position: EnrichedPosition): PositionMetrics {
  const szi = Number(position.szi);
  const unrealizedPnl = Number(position.unrealizedPnl);
  const side: 'Long' | 'Short' = szi > 0 ? 'Long' : 'Short';

  // Business logic...
  const fundingFromApi = Number(position.cumFunding.sinceOpen);
  const funding = szi > 0 ? -fundingFromApi : fundingFromApi;

  return {
    funding,
    isFundingPositive: funding > 0,
    side,
    isPnlPositive: unrealizedPnl > 0,
  };
}
```

### 2. Application 層（Domain Layer）

**職責**：實現業務邏輯，協調各個 adapter

#### Service 設計模式

**命名規範**：

- 文件名：`xxxService.ts`（camelCase）
- 類名：`XxxService`（PascalCase）

**設計原則**：

- ✅ **依賴注入**：通過構造函數注入所有依賴
- ✅ **實現 Port**：Service 實現對應的 Port 接口
- ✅ **Pure Business Logic**：不依賴 React、不依賴具體框架
- ✅ **自治設計**：盡可能自動管理內部狀態和生命週期

**兩種設計模式**：

**模式 A：自治 Service（推薦 - Position 範例）**

適用於：生命週期清晰、依賴單一數據源的場景

```typescript
// core/contexts/position/application/positionService.ts

export class PositionService implements PositionPort {
  private subscription: SubscriptionHandle | undefined;
  private walletUnsubscribe: (() => void) | undefined;

  constructor(
    private readonly webData2Repository: WebData2Repository,
    private readonly marketAdapter: MarketPort,
  ) {}

  /**
   * 啟動服務 - 開始監聽 wallet 變化
   */
  start(): void {
    // 訂閱 activeWalletStore，自動管理訂閱
    this.walletUnsubscribe = activeWalletStore.subscribe((state, prevState) => {
      if (state.wallet?.address !== prevState.wallet?.address) {
        if (state.wallet) {
          this.startSubscription(state.wallet.address);
        } else {
          this.stopSubscription();
        }
      }
    });

    // 處理初始狀態
    const currentWallet = activeWalletStore.getState().wallet;
    if (currentWallet) {
      this.startSubscription(currentWallet.address);
    }
  }

  /**
   * 停止服務 - 清理訂閱
   */
  stop(): void {
    this.walletUnsubscribe?.();
    this.stopSubscription();
  }

  // Private 方法實現內部邏輯
  private async startSubscription(userAddress: string): Promise<void> { ... }
  private async stopSubscription(): Promise<void> { ... }
  private handlePositionDataUpdate(data: hl.WebData2Response): void { ... }
  private extractPositions(data: hl.WebData2Response): Position[] { ... }
  private enrichPositions(positions: Position[]): EnrichedPosition[] { ... }
}
```

**優勢**：

- 外部只需調用 `start()` 和 `stop()`，內部自動處理一切
- 職責清晰，易於測試
- 減少外部調用的複雜度

**模式 B：協調 Service（Wallet 範例）**

適用於：需要協調多個外部服務、複雜業務邏輯的場景

```typescript
// core/contexts/wallet/application/walletService.ts

export class WalletService implements WalletPort {
  constructor(
    private readonly privyAdapter: PrivyWalletAdapter,
    private readonly reownAdapter: ReownWalletAdapter,
  ) {}

  async listAvailable(): Promise<WalletInfo[]> {
    // 協調多個 adapter
    const privyWallets = await this.privyAdapter.listAvailable();
    const reownWallets = await this.reownAdapter.listAvailable();
    return [...privyWallets, ...reownWallets];
  }

  async active(): Promise<ActiveWallet | undefined> {
    // 複雜的業務邏輯：優先級、降級等
    const selected = walletSelectionStore.getState().selectedSource;

    if (selected) {
      const adapter = this.getAdapter(selected);
      const wallet = await adapter.getActive();
      if (wallet) return wallet;
      // 降級邏輯...
    }

    // 默認優先級...
  }

  // 其他業務方法
  async connect(source: WalletSource): Promise<void> { ... }
  async disconnect(source: WalletSource): Promise<void> { ... }
}
```

**優勢**：

- 靈活協調多個外部服務
- 適合複雜的業務邏輯
- Port 暴露更多業務方法供外部調用

### 3. Adapters 層（Adapter Layer）

**職責**：適配外部依賴，隔離技術實現細節

#### 3.1 Store Adapters（狀態管理）

**命名規範**：

- 文件名：`xxxStore.ts`（camelCase）
- Store 名：`xxxStore`（camelCase）

**設計原則**：

- ✅ **使用 Zustand vanilla**：`createStore` 而非 `create`
- ✅ **類型安全**：定義 State 和 Actions 接口
- ✅ **初始化外部化**：`initialState` 單獨定義
- ✅ **操作最小化**：只提供必要的 actions

**範例**：

```typescript
// core/contexts/position/adapters/positionStore.ts

import { createStore } from 'zustand/vanilla';

interface PositionState {
  positions: EnrichedPosition[];
  isLoading: boolean;
}

interface PositionStateActions {
  setPositions: (positions: EnrichedPosition[]) => void;
  setLoading: (isLoading: boolean) => void;
  clear: () => void;
}

const initialState: PositionState = {
  positions: [],
  isLoading: false,
};

export const positionStore = createStore<PositionState & PositionStateActions>(set => ({
  ...initialState,

  setPositions: (positions: EnrichedPosition[]) => set({ positions }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  clear: () => set(initialState),
}));
```

#### 3.2 Service Adapters（外部服務）

**命名規範**：

- 文件名：`xxxAdapter.ts`（camelCase）
- 類名：`XxxAdapter`（PascalCase）

**設計原則**：

- ✅ **實現 Port 接口**：Adapter 實現外部依賴的抽象接口
- ✅ **隔離技術細節**：將外部庫/API 包裝起來
- ✅ **單一職責**：一個 Adapter 只適配一個外部服務

**Out Port 定義位置**：

兩種做法都可接受：

**方式 A：Port 定義在 adapters/ 中**（Position 的 MarketAdapter）

```typescript
// core/contexts/position/adapters/marketAdapter.ts

export interface MarketPort {
  getMarketByCoin(coin: string): MarketData | undefined;
}

export class MarketAdapter implements MarketPort {
  getMarketByCoin(coin: string): MarketData | undefined {
    const markets = useMarketsStore.getState().markets;
    return markets.find(m => m.coin === coin);
  }
}
```

**方式 B：Port 定義在 ports/ 中**（標準 DDD）

```typescript
// core/contexts/position/ports/marketPort.ts
export interface MarketPort { ... }

// core/contexts/position/adapters/marketAdapter.ts
import type { MarketPort } from '../ports/marketPort';
export class MarketAdapter implements MarketPort { ... }
```

**建議**：

- 簡單的 Out Port（只在本 context 使用）→ 方式 A
- 複雜的 Out Port（可能被其他 context 使用）→ 方式 B

### 4. ReactNative 層（React Integration Layer）

**職責**：將業務邏輯注入到 React Native 環境

**關鍵設計**：**分離關注點 - Store Hook vs Business Hook**

ReactNative 層提供兩種 hook：

1. **Store Hook** (`useXxxStore`) - 狀態訪問，性能優化
2. **Business Hook** (`useXxx`) - 業務操作，UI 整合

這種分離解決了性能問題：

- ✅ Component 只訂閱需要的 state，避免不必要的重渲染
- ✅ 業務操作和狀態訪問解耦，職責清晰
- ✅ 符合 Clean Architecture 的分層原則

#### 4.1 Composition（依賴注入組裝）

**命名規範**：

- 文件名：`xxxComposition.tsx`（camelCase）
- Provider 名：`XxxCompositionProvider`（PascalCase）

**設計原則**：

- ✅ **依賴圖文檔**：清晰註釋說明依賴關係
- ✅ **分層組裝**：React hooks → Adapters → Service
- ✅ **useMemo 穩定化**：Service 實例應該穩定
- ✅ **生命週期管理**：在 useEffect 中啟動/停止 Service

**範例**：

```typescript
// core/contexts/position/reactNative/positionComposition.tsx

/**
 * Position Composition Provider
 *
 * 設置依賴圖：
 *
 * Infrastructure Layer:
 * - WebData2Repository: HTTP + WS 混合策略（自包含）
 *
 * Adapter Layer:
 * - MarketAdapter: 市場數據訪問
 *
 * Domain Layer:
 * - PositionService: 核心業務邏輯
 *
 * PositionService 自動監聽 active wallet 變化並管理訂閱。
 */
export function PositionCompositionProvider({ children }: PositionCompositionProviderProps) {
  // 創建穩定的 service 實例
  const positionService = useMemo(() => {
    // Infrastructure: Repository 處理數據訪問（自包含）
    const webData2Repository = new WebData2Repository();

    // Adapter: 市場數據訪問
    const marketAdapter = new MarketAdapter();

    // Domain: Service 直接依賴
    return new PositionService(webData2Repository, marketAdapter);
  }, []);

  // 管理 service 生命週期
  useEffect(() => {
    // 啟動 service（開始監聽 wallet 變化）
    positionService.start();

    return () => {
      // 停止 service（清理訂閱）
      positionService.stop();
    };
  }, [positionService]);

  const value = useMemo(
    () => ({
      positionService,
    }),
    [positionService],
  );

  return <PositionContext.Provider value={value}>{children}</PositionContext.Provider>;
}
```

#### 4.2 Store Hook（狀態訪問）

**命名規範**：

- 文件名：`useXxxStore.ts`（camelCase）
- Hook 名：`useXxxStore`（camelCase）

**職責**：

- 提供狀態訪問接口
- 通過 selector 實現精確訂閱
- **不包含**業務操作

**設計原則**：

- ✅ 提供通用的 selector hook
- ✅ 讓用戶自由組合 selector
- ✅ 只訂閱需要的字段，避免不必要的重渲染
- ❌ 不要為每個常見用例創建專門的 hook
- ❌ 不要在這裡放業務操作

**性能優勢**：

```typescript
// ❌ 錯誤方式：展開所有 state（任何 state 變化都會重渲染）
const { agentAddress, isApproved, allAgents } = useAgent();

// ✅ 正確方式：精確訂閱（只在 agentAddress 變化時重渲染）
const agentAddress = useAgentStore(state => state.agentAddress);
```

**範例**：

````typescript
// core/contexts/agent/reactNative/useAgentStore.ts

/**
 * Hook to access agent store
 *
 * Use custom selectors for optimal performance.
 * Only subscribes to the fields you actually use.
 *
 * @example
 * ```typescript
 * // Only re-render when agentAddress changes
 * const agentAddress = useAgentStore(state => state.agentAddress);
 *
 * // Only re-render when isApproved changes
 * const isApproved = useAgentStore(state => state.isApproved);
 *
 * // Combine multiple fields (re-render when any changes)
 * const { agentAddress, isApproved } = useAgentStore(state => ({
 *   agentAddress: state.agentAddress,
 *   isApproved: state.isApproved,
 * }));
 * ```
 */
export function useAgentStore<T>(
  selector: (state: ReturnType<typeof agentStateStore.getState>) => T,
): T {
  return useStore(agentStateStore, selector);
}
````

#### 4.3 Business Hook（業務操作）

**命名規範**：

- 文件名：`useXxx.ts`（camelCase）
- Hook 名：`useXxx`（camelCase）
- 返回類型：`UseXxxResult`

**職責**：

- 提供業務操作方法
- UI 整合（Alert 對話框、導航等）
- UI loading 狀態管理
- **不包含** store state（用 Store Hook 替代）

**設計原則**：

- ✅ 只暴露業務操作和 UI state
- ✅ Store state 應該通過 Store Hook 訪問
- ✅ 使用 useCallback 確保方法引用穩定
- ❌ 不要暴露 store state（性能問題）

**範例**：

```typescript
// core/contexts/agent/reactNative/useAgent.ts

export interface UseAgentResult {
  /** UI loading state only */
  isLoading: boolean;

  /** Business operations */
  checkStatus: () => Promise<AgentApprovalStatus>;
  approve: () => Promise<boolean>;
  revoke: (agentName: string) => Promise<boolean>;
  getAgentExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
}

/**
 * useAgent - Agent business operations hook
 *
 * For state access, use useAgentStore instead for better performance.
 */
export function useAgent(): UseAgentResult {
  const { agentService } = useAgentComposition();

  // UI state only
  const [isLoading, setIsLoading] = useState(false);

  // Business operations with loading management
  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      return await agentService.checkApprovalStatus();
    } finally {
      setIsLoading(false);
    }
  }, [agentService]);

  // ... other operations

  return {
    isLoading,
    checkStatus,
    approve,
    revoke,
    getAgentExchangeClient,
  };
}
```

#### 4.4 使用範例：混合方案

```typescript
// Component 使用方式
import { useAgentStore, useAgent } from '@/core/composition';

function AgentStatusScreen() {
  // State access - 精確訂閱
  const agentAddress = useAgentStore(state => state.agentAddress);
  const isApproved = useAgentStore(state => state.isApproved);
  const allAgents = useAgentStore(state => state.allAgents);

  // Business operations
  const { approve, checkStatus, isLoading } = useAgent();

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return (
    <View>
      <Text>Address: {agentAddress}</Text>
      <Text>Approved: {isApproved ? 'Yes' : 'No'}</Text>
      <Button onPress={approve} loading={isLoading}>
        Approve
      </Button>
    </View>
  );
}
```

### 5. Config 層（可選）

**命名規範**：

- 文件名：`config.ts`
- 常量名：`UPPER_SNAKE_CASE`

**使用場景**：

- ✅ 硬編碼的業務配置
- ✅ 外部地址、費率等參數
- ✅ 默認值

**範例**：

```typescript
// core/contexts/referral/config.ts

export const REFERRAL_CONFIG = {
  defaultReferrer: '0x...',
  enabled: true,
} as const;

// core/contexts/agent/config.ts

export const DEFAULT_AGENT_NAME = 'Riverrun Agent';
export const AGENT_APPROVAL_TIMEOUT = 30000; // 30s
```

---

## 跨 Context 依賴管理

### 依賴關係圖

```
Wallet Context (基礎服務)
    ↑
    ├── Agent Context
    ├── Referral Context
    └── BuilderFee Context

Position Context (完全獨立)
```

### 依賴注入方式

**通過構造函數注入 Port**：

```typescript
// core/contexts/agent/application/agentService.ts

export class AgentService implements AgentPort {
  constructor(
    private readonly walletService: WalletPort, // 依賴 Wallet Port
    private readonly hyperliquidAdapter: HyperliquidAdapter,
  ) {}

  async checkApprovalStatus(): Promise<AgentApprovalStatus> {
    // 使用 walletService 獲取當前錢包
    const wallet = await this.walletService.active();
    if (!wallet) throw new Error('No active wallet');

    // 業務邏輯...
  }
}

// core/contexts/agent/reactNative/agentComposition.tsx

export function AgentCompositionProvider({ children }) {
  // 獲取 Wallet Service（從 Context 注入）
  const { walletService } = useWalletContext();

  const agentService = useMemo(() => {
    const hyperliquidAdapter = new HyperliquidAdapter();
    return new AgentService(walletService, hyperliquidAdapter);
  }, [walletService]);

  // ...
}
```

### 避免循環依賴

**原則**：

- ✅ 單向依賴（有清晰的基礎服務）
- ✅ 通過 Store 通訊（而非直接依賴 Service）
- ❌ 禁止循環依賴（A → B → A）

**範例**：Position 和 Wallet 的解耦

```typescript
// ❌ 錯誤：Position Service 依賴 Wallet Service
class PositionService {
  constructor(private walletService: WalletPort) {}

  start() {
    const wallet = await this.walletService.active(); // 緊耦合
  }
}

// ✅ 正確：Position Service 訂閱 activeWalletStore
class PositionService {
  start() {
    // 通過 Store 通訊，不直接依賴 WalletService
    this.walletUnsubscribe = activeWalletStore.subscribe(state => {
      if (state.wallet) {
        this.startSubscription(state.wallet.address);
      }
    });
  }
}
```

---

## 命名規範總覽

### 文件命名

| 類型                     | 命名規範   | 範例                    |
| ------------------------ | ---------- | ----------------------- |
| Route 文件（App Router） | kebab-case | `deposit-hl-bridge.tsx` |
| React Component          | PascalCase | `WalletInfo.tsx`        |
| Hook                     | camelCase  | `useOrderBook.ts`       |
| Service                  | camelCase  | `positionService.ts`    |
| Adapter                  | camelCase  | `marketAdapter.ts`      |
| Store                    | camelCase  | `positionStore.ts`      |
| Port                     | camelCase  | `positionPort.ts`       |
| Types                    | camelCase  | `types.ts`              |
| Config                   | camelCase  | `config.ts`             |
| Utility                  | camelCase  | `marketUtils.ts`        |

### 導出命名

| 類型            | 命名規範         | 範例                               |
| --------------- | ---------------- | ---------------------------------- |
| React Component | PascalCase       | `export const WalletInfo`          |
| Hook            | camelCase        | `export function useOrderBook`     |
| Service Class   | PascalCase       | `export class PositionService`     |
| Port Interface  | PascalCase       | `export interface PositionPort`    |
| Type/Interface  | PascalCase       | `export type Order`                |
| Function        | camelCase        | `export function calculateMetrics` |
| Constant        | UPPER_SNAKE_CASE | `export const MAX_LEVERAGE`        |
| Store           | camelCase        | `export const positionStore`       |

---

## Infrastructure 層（Infra）

### Repository Pattern

**位置**：`core/infra/hyperliquid/repositories/`

**職責**：

- 封裝數據訪問邏輯
- 隱藏數據源細節（HTTP、WebSocket、Cache）
- 實現混合策略（如 HTTP + WS）
- 可被多個 Context 複用

**範例**：

```typescript
// core/infra/hyperliquid/repositories/webData2Repository.ts

export class WebData2Repository {
  private readonly httpClient: hl.InfoClient;

  constructor() {
    // 自行獲取依賴 - 簡化使用
    this.httpClient = getInfoClient();
  }

  async subscribe(
    userAddress: string,
    callback: (data: hl.WebData2Response) => void,
  ): Promise<SubscriptionHandle> {
    // Step 1: HTTP 快速獲取（~100ms）
    try {
      const httpData = await this.httpClient.webData2({ user: userAddress });
      callback(httpData);
    } catch (error) {
      console.warn('[WebData2Repository] HTTP fetch failed, relying on WebSocket:', error);
    }

    // Step 2: WebSocket 實時更新（~1s）
    const handle = await subscriptionManager.subscribe('webData2', { user: userAddress }, callback);

    return {
      unsubscribe: async () => {
        await subscriptionManager.unsubscribe(handle);
      },
    };
  }
}
```

**優勢**：

- HTTP + WS 混合策略只需實現一次
- 可被 Position、Account、Dashboard 等多個 Context 使用
- 簡化測試（mock Repository 比 mock 底層 client 更有意義）

### Subscription Management

**位置**：`core/infra/hyperliquid/subscription/`

**職責**：

- 統一的 WebSocket 訂閱管理
- RefCount 機制（多訂閱者共享連接）
- AppState Lifecycle 管理（自動暫停/恢復）
- Pure JavaScript 實現（不依賴 React）

詳見：`@core/infra/hyperliquid/subscription/README.md`

---

## 最佳實踐檢查清單

### 創建新 Context

當你需要創建新的 Context 時，請遵循以下步驟：

#### ✅ 1. 規劃階段

- [ ] 確定業務範圍（這個 Context 管理什麼業務領域？）
- [ ] 識別依賴關係（需要依賴哪些其他 Context？）
- [ ] 設計 Port 接口（對外暴露哪些業務能力？）
- [ ] 選擇設計模式（自治 Service vs 協調 Service？）

#### ✅ 2. 實現階段

**Step 1: 創建目錄結構**

```bash
mkdir -p core/contexts/new-context/{ports,application,adapters,reactNative}
```

**Step 2: 定義 Port 和 Types**

```typescript
// ports/newContextPort.ts
export interface NewContextPort {
  // 業務方法...
}

// ports/types.ts
export interface NewContextState { ... }
export function calculateSomething(...) { ... } // Pure functions
```

**Step 3: 實現 Service**

```typescript
// application/newContextService.ts
export class NewContextService implements NewContextPort {
  constructor(
    private readonly dependency1: Dependency1Port,
    private readonly dependency2: Dependency2Adapter,
  ) {}

  // 實現業務邏輯...
}
```

**Step 4: 創建 Adapters**

```typescript
// adapters/newContextStore.ts
export const newContextStore = createStore<State & Actions>(...)

// adapters/externalServiceAdapter.ts (如需要)
export class ExternalServiceAdapter { ... }
```

**Step 5: 組裝 Composition**

```typescript
// reactNative/newContextComposition.tsx
/**
 * 依賴圖：
 * - Dependency1
 * - Dependency2
 * - NewContextService
 */
export function NewContextCompositionProvider({ children }) {
  const service = useMemo(() => {
    // 組裝依賴...
    return new NewContextService(...);
  }, []);

  useEffect(() => {
    service.start?.();
    return () => service.stop?.();
  }, [service]);

  // ...
}
```

**Step 6: 導出 Store Hook（如需要）**

```typescript
// reactNative/useNewContextStore.ts (如需要)
export function useNewContextStore<T>(selector) { ... }
```

#### ✅ 3. 文檔階段

- [ ] 在 Composition 中添加依賴圖註釋
- [ ] 為 Port 接口添加 JSDoc 註釋
- [ ] 為 Pure Functions 添加使用範例
- [ ] 更新本 README（如有新模式）

#### ✅ 4. 測試階段

- [ ] Service 單元測試（mock adapters）
- [ ] Pure Functions 測試
- [ ] 集成測試（如有跨 Context 依賴）

### 重構現有代碼

#### 從舊架構遷移到新架構

**Step 1: 識別業務邏輯**

- 找出分散在各處的業務邏輯
- 識別外部依賴（API、Store、Hook 等）

**Step 2: 提取 Service**

- 將業務邏輯集中到 Service 中
- 移除 React 依賴（改用 Zustand vanilla）

**Step 3: 定義 Port**

- 提取對外接口到 Port
- 簡化接口（移除不必要的方法）

**Step 4: 創建 Adapters**

- 將外部依賴包裝為 Adapter
- Store 使用 `createStore`（vanilla Zustand）

**Step 5: 組裝 Composition**

- 在 Composition 中注入依賴
- 管理 Service 生命週期

**Step 6: 更新使用點**

- UI 層：狀態使用 `useXxxStore`，操作使用 `useXxx`
- 移除舊的直接依賴

**Step 7: 刪除舊代碼**

- 確認無引用後刪除舊文件
- 運行編譯檢查

---

## 常見問題 FAQ

### Q1: Port 應該暴露多少方法？

**A**: 盡可能少。

- ✅ 好的設計：2-4 個核心業務方法（如 Position 的 `start/stop`）
- ⚠️ 可接受：4-8 個方法（如 Wallet 的多種操作）
- ❌ 需要重構：>10 個方法（可能職責不單一）

### Q2: 何時使用自治 Service？何時使用協調 Service？

**自治 Service**：

- 生命週期清晰（start/stop）
- 依賴單一數據源
- 自動處理內部狀態變化
- 範例：Position Service

**協調 Service**：

- 需要協調多個外部服務
- 複雜的業務邏輯
- 頻繁的外部調用
- 範例：Wallet Service

### Q3: Store Hook vs Business Hook 該如何選擇？

**A**: 根據使用場景選擇：

**使用 Store Hook (`useXxxStore`)** - 訪問狀態時：

- ✅ 需要訂閱 state 變化
- ✅ 想要精確控制重渲染
- ✅ 只需要讀取數據
- 範例：顯示 agent address、approval 狀態

**使用 Business Hook (`useXxx`)** - 執行操作時：

- ✅ 需要執行業務操作
- ✅ 需要 UI loading 狀態
- ✅ 需要 UI 整合（Alert、導航等）
- 範例：approve agent、check status

**同時使用** - 大多數情況：

```typescript
// State access
const isApproved = useAgentStore(state => state.isApproved);
const agentAddress = useAgentStore(state => state.agentAddress);

// Business operations
const { approve, isLoading } = useAgent();
```

**為什麼不能在 Business Hook 中暴露 state？**

性能問題：Business Hook 會在**任何一個** state 變化時重新執行，導致不必要的重渲染。

```typescript
// ❌ 錯誤：useAgent 暴露所有 state
const { agentAddress, isApproved, allAgents, approve } = useAgent();
// 任何一個 state 變化，useAgent 都會重新執行，component 重渲染

// ✅ 正確：分離訪問
const agentAddress = useAgentStore(state => state.agentAddress);
// 只在 agentAddress 變化時重渲染
```

### Q4: Out Port 應該放在 ports/ 還是 adapters/？

**兩種做法都可接受**：

**放在 adapters/（簡化）**：

- 只在本 Context 使用
- 簡單的適配接口
- 範例：MarketAdapter

**放在 ports/（標準 DDD）**：

- 可能被其他 Context 使用
- 複雜的業務抽象
- 需要多個實現

### Q5: Store 應該暴露到 Port 嗎？

**A**: **不應該**。

Store 是 Adapter 層的實現細節，不應該出現在 Port 接口中：

```typescript
// ❌ 錯誤：Port 暴露 Store
export interface AgentPort {
  store: AgentStateStore; // 違反分層原則
  approve(): Promise<void>;
}

// ✅ 正確：Port 只暴露業務方法
export interface AgentPort {
  checkApprovalStatus(): Promise<AgentApprovalStatus>;
  approveAgent(): Promise<boolean>;
}
```

**原因**：

- Port 應該是純粹的業務接口
- 不應該依賴具體的狀態管理方案（Zustand/Redux/MobX）
- 保持 Domain Layer 的框架獨立性
- Store 通過 Store Hook 訪問即可，不需要在 Port 中暴露

**React Native 層的訪問方式**：

```typescript
// ✅ 正確：直接通過 Store Hook 訪問
const agentAddress = useAgentStore(state => state.agentAddress);

// ✅ 正確：業務操作通過 Service
const { approve } = useAgent();
```

### Q6: 何時創建 config.ts？

**需要 config.ts 的場景**：

- 有硬編碼的業務配置
- 外部地址、費率等參數
- 需要集中管理的常量

**不需要 config.ts 的場景**：

- 所有配置都是動態的
- 沒有硬編碼值

### Q7: 是否可以跨 Context 直接依賴 Service？

**可以，但有限制**：

✅ **允許**：

- 單向依賴（清晰的基礎服務關係）
- 通過構造函數注入 Port（而非具體 Service）

❌ **禁止**：

- 循環依賴
- 直接依賴具體 Service 類（應依賴 Port）

**推薦**：

- 優先通過 Store 通訊（解耦）
- 只在必要時跨 Service 依賴

### Q8: 如何測試 Service？

**單元測試模式**：

```typescript
describe('PositionService', () => {
  it('should start subscription when wallet connects', async () => {
    // Mock dependencies
    const mockRepository = {
      subscribe: jest.fn().mockResolvedValue({ unsubscribe: jest.fn() }),
    };
    const mockMarketAdapter = {
      getMarketByCoin: jest.fn().mockReturnValue({ markPx: '50000', szDecimals: 4 }),
    };

    // Create service with mocks
    const service = new PositionService(mockRepository, mockMarketAdapter);

    // Test
    service.start();

    // Simulate wallet change
    activeWalletStore.getState().setWallet({ address: '0x123' });

    // Verify
    await waitFor(() => {
      expect(mockRepository.subscribe).toHaveBeenCalledWith('0x123', expect.any(Function));
    });
  });
});
```

---

## 範例：完整的 Context 實現

### 範例 1：Position Context（自治 Service）

**最佳實踐**：只需要狀態訪問，不需要業務操作 hook

```
core/contexts/position/
├── ports/
│   ├── positionPort.ts          # In Port（2 個方法：start/stop）
│   ├── types.ts                 # Domain types + Pure functions
│   └── index.ts
├── application/
│   └── positionService.ts       # 自治 Service（150 行）
├── adapters/
│   ├── positionStore.ts         # Zustand vanilla store
│   ├── marketAdapter.ts         # Market 數據適配
│   └── index.ts
└── reactNative/
    ├── positionComposition.tsx  # DI 組裝（詳細文檔）
    └── usePositionStore.ts      # Store hook（只需要狀態訪問）
```

**特點**：

- ✅ 最小化 Port（僅 2 個方法）
- ✅ 自治設計（自動監聽 wallet 變化）
- ✅ Pure Functions（calculatePositionMetrics）
- ✅ 清晰的依賴圖文檔
- ✅ 完全的框架獨立性
- ✅ 只需要 Store Hook（Service 自動運行，UI 只需訂閱狀態）

### 範例 2：Agent Context（協調 Service + UI 操作）

**混合方案**：需要狀態訪問 + 業務操作

```
core/contexts/agent/
├── ports/
│   ├── agentPort.ts             # In Port（業務方法）
│   ├── types.ts                 # Domain types
│   └── index.ts
├── application/
│   └── agentService.ts          # 協調 Service
├── adapters/
│   ├── agentStateStore.ts       # Zustand vanilla store
│   ├── agentWalletManager.ts    # Agent wallet 管理
│   ├── hyperliquidAgentAdapter.ts # Hyperliquid API 適配
│   └── index.ts
└── reactNative/
    ├── agentComposition.tsx     # DI 組裝
    ├── useAgent.ts              # Business hook（操作 + UI state）
    └── useAgentStore.ts         # Store hook（狀態訪問）
```

**特點**：

- ✅ 分離關注點（狀態訪問 vs 業務操作）
- ✅ 性能優化（精確訂閱，避免不必要重渲染）
- ✅ UI 整合（Alert 對話框、loading 狀態）
- ✅ 清晰的職責劃分

**使用方式**：

```typescript
// State access - 精確訂閱
const agentAddress = useAgentStore(state => state.agentAddress);
const isApproved = useAgentStore(state => state.isApproved);

// Business operations
const { approve, checkStatus, isLoading } = useAgent();
```

---

## 總結

這個架構的核心目標是：

1. **清晰的職責劃分** - 每一層都有明確的職責
2. **框架獨立** - 業務邏輯不依賴 React Native
3. **易於測試** - 通過依賴注入實現可測試性
4. **可擴展** - 通過 Port 和 Adapter 實現靈活性
5. **會尖叫的架構** - 文件名直接表達用途
6. **性能優化** - Store Hook vs Business Hook 分離，精確訂閱

### ReactNative 層的設計模式

**混合方案 - Store Hook + Business Hook**：

- ✅ **Store Hook** (`useXxxStore`) - 狀態訪問，性能優化
  - 精確訂閱，只在需要的 state 變化時重渲染
  - 開發者自由組合 selector
  - 適用於數據展示

- ✅ **Business Hook** (`useXxx`) - 業務操作，UI 整合
  - 提供業務方法和 UI loading 狀態
  - UI 整合（Alert、導航等）
  - 不暴露 store state（避免性能問題）

**兩種模式的使用場景**：

1. **只需要狀態訪問** - 僅提供 Store Hook
   - 範例：Position Context（自治 Service 自動運行）

2. **需要狀態 + 操作** - 提供 Store Hook + Business Hook
   - 範例：Agent/BuilderFee/Referral Context（需要手動觸發操作）

**下一步行動**：

- 參考 Position Context（自治模式）或 Agent Context（混合模式）創建新的 Context
- 使用檢查清單確保遵循最佳實踐
- 遇到問題查閱本文檔的 FAQ 部分
