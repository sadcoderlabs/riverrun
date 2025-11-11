# Hyperliquid Subscription Infrastructure

統一的 Hyperliquid WebSocket 訂閱管理系統 - Pure JavaScript 實現。

## 📋 目錄

- [概述](#概述)
- [架構設計](#架構設計)
- [當前狀態](#當前狀態)
- [遷移策略](#遷移策略)
- [使用指南](#使用指南)
- [HTTP + WebSocket 混合策略](#http--websocket-混合策略)

---

## 概述

這個 subscription infrastructure 是 Riverrun 項目的核心基礎設施，提供：

- ✅ **Pure JavaScript** - 不依賴 React 或 Zustand
- ✅ **RefCount 機制** - 多訂閱者共享單一 WebSocket 連接
- ✅ **AppState Lifecycle** - 自動管理 App 背景/前景時的連接
- ✅ **Clean Architecture** - 遵循 DDD 原則的六角架構

## 架構設計

### 目錄結構

```
core/infra/hyperliquid/
├── subscription/             # WebSocket 訂閱管理
│   ├── types.ts             # 核心類型定義
│   ├── subscriptionRegistry.ts  # 訂閱配置註冊表
│   ├── subscriptionManager.ts   # 訂閱管理器 (Pure JS Map)
│   ├── configs.ts           # 訂閱配置
│   └── index.ts            # 統一導出
│
└── repositories/            # Repository Pattern (DDD) ⭐ 新增
    ├── webData2Repository.ts   # WebData2 數據訪問
    └── index.ts            # 統一導出
```

### 核心組件

#### 1. SubscriptionManager

使用 `Map<string, SubscriptionEntry>` 管理所有訂閱：

- **RefCount**: 多個訂閱者共享同一個 WebSocket 連接
- **pauseAll/resumeAll**: App Lifecycle 管理
- **自動清理**: 當 refCount 降為 0 時自動取消訂閱

#### 2. SubscriptionRegistry

集中管理訂閱配置：

```typescript
subscriptionRegistry.register<WebData2Params, WebData2Data>('webData2', {
  getKey: params => params.user,
  subscribe: async (params, callback) => {
    const client = getSubscriptionClient();
    return await client.webData2({ user: params.user }, callback);
  },
});
```

#### 3. Repository Pattern ⭐ 核心設計

**為什麼需要 Repository？**

Repository 是 DDD 的標準模式，用於封裝數據訪問邏輯：

- ✅ 隱藏數據源細節（HTTP、WebSocket、Cache）
- ✅ 實現 HTTP + WS 混合策略
- ✅ 可被多個 Context 複用
- ✅ 符合 DDD 分層原則

**WebData2Repository 示例**：

```typescript
export class WebData2Repository {
  constructor(
    private readonly httpClient: hl.InfoClient,
    private readonly subscriptionManager: ISubscriptionManager,
  ) {}

  async subscribe(
    userAddress: string,
    callback: (data: hl.WebData2Response) => void,
  ): Promise<SubscriptionHandle> {
    // Step 1: HTTP fetch (~100ms) - 快速顯示
    const httpData = await this.httpClient.webData2({ user: userAddress });
    callback(httpData);

    // Step 2: WebSocket subscription (~1s) - 實時更新
    const handle = await this.subscriptionManager.subscribe(
      'webData2',
      { user: userAddress },
      callback,
    );

    return { unsubscribe: () => this.subscriptionManager.unsubscribe(handle) };
  }
}
```

**關鍵優勢**：

1. **可複用**: WebData2Repository 可被 Position、Account 等多個 Context 使用
2. **職責單一**: Repository 只負責數據訪問，不包含業務邏輯
3. **易於測試**: 可以 mock Repository 測試 Service
4. **符合 DDD**: Infrastructure Layer 的標準設計模式

---

## 當前狀態

### 🚧 漸進式遷移中

目前項目中有**兩個並存**的 subscription 系統：

#### 1. `core/infra/hyperliquid/subscription/` (新，目標)

- **實現**: Pure JavaScript (Map-based)
- **使用場景**: Position Context
- **支援的訂閱**: `webData2`
- **管理方式**: `app/_layout.tsx` 中統一管理

#### 2. `lib/hyperliquid/subscription/` (舊，逐步淘汰)

- **實現**: React + Zustand
- **使用場景**: 大部分應用層 hooks
- **支援的訂閱**: 8 種 (allMids, orderBook, userFills, webData2, 等)
- **管理方式**: `app/_layout.tsx` 中統一管理

### AppState Lifecycle 管理

兩個 subscription manager 都在 `app/_layout.tsx` 中被統一管理：

```typescript
import { subscriptionManager as libSubscriptionManager } from '@/lib/hyperliquid/subscription';
import { subscriptionManager as coreSubscriptionManager } from '@/core/infra/hyperliquid/subscription';

useEffect(() => {
  if (appState === 'active') {
    void Promise.all([libSubscriptionManager.resumeAll(), coreSubscriptionManager.resumeAll()]);
  } else if (appState === 'paused') {
    void Promise.all([libSubscriptionManager.pauseAll(), coreSubscriptionManager.pauseAll()]);
  }
}, [appState]);
```

---

## 遷移策略

### 🎯 最終目標

將所有 subscription 遷移到 `core/infra/hyperliquid/subscription/`，完全移除 `lib/hyperliquid/subscription/`。

### 📋 遷移檢查清單 (Repository Pattern)

當準備遷移某個 subscription 時：

1. **Infrastructure Layer**
   - [ ] 在 `configs.ts` 中註冊新的 subscription type
   - [ ] 創建 Repository（封裝 HTTP + WS 混合策略）

2. **Domain Layer**
   - [ ] 創建 Port 接口（Domain 抽象）
   - [ ] 創建 Adapter（Repository → Port）
   - [ ] 更新 Service 使用 Port

3. **Testing**
   - [ ] 測試 AppState Lifecycle（pause/resume）
   - [ ] 測試 RefCount 機制（多訂閱者共享連接）
   - [ ] 測試 HTTP + WS 混合策略

4. **Cleanup**
   - [ ] 移除 `lib/hyperliquid/subscription/` 中對應的使用

### 📚 遷移範例：Position Context (簡化架構)

Position Context 採用簡化的直接依賴架構，減少不必要的抽象層。

#### 架構分層

```
┌─────────────────────────────────────────────────┐
│          Infrastructure Layer                    │
│  ┌──────────────────────────────────────────┐  │
│  │ WebData2Repository                       │  │
│  │ - HTTP + WS hybrid strategy              │  │
│  │ - Self-contained (gets own dependencies) │  │
│  │ - Reusable across contexts               │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                    ↑
                    │ direct dependency
                    │
┌─────────────────────────────────────────────────┐
│            Domain Layer                          │
│  ┌──────────────────────────────────────────┐  │
│  │ PositionService                          │  │
│  │ - Business logic                         │  │
│  │ - Directly depends on Repository         │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

#### 目錄結構

```
core/
├── infra/hyperliquid/repositories/
│   └── webData2Repository.ts        # ⭐ Repository (自給自足, 可複用)
│
└── contexts/position/
    ├── ports/
    │   ├── positionPort.ts          # In Port (對外接口)
    │   └── types.ts                 # Domain types
    ├── adapters/
    │   └── marketAdapter.ts         # Out Port (對外依賴)
    ├── application/
    │   └── positionService.ts       # 直接依賴 Repository
    └── reactNative/
        └── positionComposition.tsx  # 組裝依賴
```

#### 關鍵設計：簡化架構 ⭐

**1. Repository（Infrastructure Layer）- 自給自足**

```typescript
// core/infra/hyperliquid/repositories/webData2Repository.ts
import { getInfoClient } from '@/lib/hyperliquid/client/getter';
import { subscriptionManager } from '../subscription';

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
    // HTTP 快速獲取
    const httpData = await this.httpClient.webData2({ user: userAddress });
    callback(httpData);

    // WebSocket 實時更新
    const handle = await subscriptionManager.subscribe('webData2', { user: userAddress }, callback);

    return { unsubscribe: () => subscriptionManager.unsubscribe(handle) };
  }
}
```

**2. Service（Domain Layer）- 直接依賴**

```typescript
// core/contexts/position/application/positionService.ts
export class PositionService {
  constructor(
    private readonly webData2Repository: WebData2Repository, // 直接依賴
    private readonly marketAdapter: MarketPort,
  ) {}

  private async startSubscription(userAddress: string): Promise<void> {
    // 直接使用 Repository，清晰直接
    this.subscription = await this.webData2Repository.subscribe(
      userAddress,
      (data: hl.WebData2Response) => this.handlePositionDataUpdate(data),
    );
  }
}
```

**3. Composition（組裝層）- 簡潔組裝**

```typescript
// core/contexts/position/reactNative/positionComposition.tsx
const positionService = useMemo(() => {
  // Infrastructure: 自給自足的 Repository
  const webData2Repository = new WebData2Repository();

  // Adapter: 市場數據訪問
  const marketAdapter = new MarketAdapter();

  // Domain: 直接依賴
  return new PositionService(webData2Repository, marketAdapter);
}, []);
```

#### 簡化架構優勢總結

✅ **更直接**:

- 減少抽象層級，代碼更容易理解
- Service 直接依賴 Repository，沒有中間層

✅ **更簡潔**:

- 移除了 PositionDataAdapter 和 PositionDataPort
- 更少的文件，更少的樣板代碼

✅ **可複用性**:

- WebData2Repository 仍可被多個 Context 使用
- HTTP + WS 混合策略只需實現一次

✅ **易於測試**:

- 測試時 mock WebData2Repository 比 mock 底層 client 更有意義
- Repository 自包含，測試更簡單

✅ **務實的 DDD**:

- ports/ 目錄只包含 in ports（對外接口）
- out ports（對外依賴）放在 adapters/ 目錄
- 清晰的職責劃分，不過度設計

---

## 使用指南

### 1. 註冊新的 Subscription Type

在 `configs.ts` 中添加：

```typescript
subscriptionRegistry.register<OrderUpdatesParams, OrderUpdatesData>('orderUpdates', {
  getKey: params => params.user,
  subscribe: async (params, callback) => {
    const client = getSubscriptionClient();
    return await client.orderUpdates({ user: params.user }, callback);
  },
});
```

### 2. 在 Service 中使用

```typescript
// 通過 SubscriptionPort 抽象使用
const handle = await this.subscriptionPort.subscribe('orderUpdates', { user: address }, data =>
  this.handleUpdate(data),
);
```

### 3. 取消訂閱

```typescript
await handle.unsubscribe();
```

---

## HTTP + WebSocket 混合策略

### 🎯 設計目標

提供更好的用戶體驗：

- **快速顯示** (~100ms): HTTP fetch 立即獲取數據
- **實時更新** (~1s): WebSocket 提供實時數據流

### 📐 實現模式

#### 模式 A：DataAdapter 層（推薦）

適用於需要複雜數據處理的場景（如 Position）：

```typescript
export class PositionDataAdapter {
  constructor(
    private readonly httpClient: hl.InfoClient,
    private readonly subscriptionPort: SubscriptionPort,
  ) {}

  async startSubscription(
    userAddress: string,
    callback: (data: WebData2Data) => void,
  ): Promise<SubscriptionHandle> {
    // HTTP 先行
    const httpData = await this.httpClient.webData2({ user: userAddress });
    callback(httpData);

    // WebSocket 跟進
    return await this.subscriptionPort.subscribeWebData2(userAddress, callback);
  }
}
```

#### 模式 B：Hook 層（簡單場景）

適用於簡單的訂閱場景：

```typescript
function useWebData2() {
  const [data, setData] = useState();

  // HTTP fetch
  const { data: httpData } = useQuery({
    queryFn: async () => await infoClient.webData2({ user: address }),
  });

  useEffect(() => {
    if (httpData) setData(httpData);
  }, [httpData]);

  // WebSocket subscription
  const { data: wsData } = useSubscription('webData2', { user: address });

  useEffect(() => {
    if (wsData) setData(wsData);
  }, [wsData]);

  return data;
}
```

### ⚖️ 選擇指南

- **Domain Layer 需求** → 使用 DataAdapter 模式
- **React Hook 層** → 使用 Hook 模式
- **複雜業務邏輯** → 使用 DataAdapter 模式
- **簡單數據展示** → 使用 Hook 模式

---

## 最佳實踐

### ✅ DO

- 使用 Repository 封裝 HTTP + WS 混合邏輯
- Repository 自行獲取依賴，保持簡潔
- 在 Domain Layer 保持 Pure JavaScript
- ports/ 目錄只放 in ports（對外接口）
- out ports（對外依賴）放在 adapters/ 目錄
- 在 Composition Root 組裝依賴
- 為每個 subscription type 提供清晰的配置

### ❌ DON'T

- 在 Domain Layer 直接依賴 React hooks
- 過度抽象，創建不必要的中間層
- 在多處手動管理 AppState Lifecycle
- 將所有 ports 都放在 ports/ 目錄（區分 in/out）

---

## 疑難排解

### Q: Subscription 在 App 背景時沒有暫停？

**A**: 確認 `app/_layout.tsx` 中有正確調用 `coreSubscriptionManager.pauseAll()`。

### Q: 數據顯示太慢？

**A**: 考慮實現 HTTP + WS 混合策略，先用 HTTP 快速獲取數據。

### Q: 多個組件重複訂閱？

**A**: RefCount 機制會自動共享連接，這是正常的。只有當所有訂閱者都取消時才會關閉連接。

---

## 相關資源

- **Position Context**: 完整的遷移範例
- **AppState Lifecycle**: `lib/riverrun/common/useAppLifecycle.ts`
- **InfoClient**: `lib/hyperliquid/client/infoClient.ts`
- **Subscription Client**: `lib/hyperliquid/client/getter.ts`

---

**最後更新**: 2025-01-12
**維護者**: Riverrun Team
