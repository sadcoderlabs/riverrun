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

```
core/infra/hyperliquid/subscription/
├── types.ts                  # 核心類型定義
├── subscriptionRegistry.ts   # 訂閱配置註冊表
├── subscriptionManager.ts    # 訂閱管理器 (Pure JS Map)
├── configs.ts               # 訂閱配置 (目前: webData2)
└── index.ts                # 統一導出
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

### 📋 遷移檢查清單

當準備遷移某個 subscription 時：

- [ ] 在 `configs.ts` 中註冊新的 subscription type
- [ ] 創建對應的 Adapter 實現 HTTP + WS 混合策略（如需要）
- [ ] 更新對應的 Context 使用新的 infrastructure
- [ ] 測試 AppState Lifecycle（pause/resume）
- [ ] 測試 RefCount 機制（多訂閱者共享連接）
- [ ] 移除 `lib/hyperliquid/subscription/` 中對應的使用

### 📚 遷移範例：Position Context

Position Context 是第一個完成遷移的範例，展示了完整的遷移模式。

#### 目錄結構

```
core/contexts/position/
├── ports/                     # Interface definitions
│   ├── subscriptionPort.ts   # WebSocket 訂閱介面
│   └── positionPort.ts       # Position 服務介面
├── adapters/                 # Infrastructure adapters
│   ├── subscriptionAdapter.ts      # WebSocket 訂閱 adapter
│   ├── positionDataAdapter.ts      # HTTP + WS 混合策略 ⭐
│   └── marketAdapter.ts            # 市場數據 adapter
├── application/
│   └── positionService.ts    # 核心業務邏輯
└── reactNative/
    └── positionComposition.tsx  # 依賴注入組裝
```

#### 關鍵設計：PositionDataAdapter ⭐

實現 HTTP + WebSocket 混合策略：

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
    // Step 1: HTTP fetch for immediate data (~100ms)
    try {
      const httpData = await this.httpClient.webData2({ user: userAddress });
      callback(httpData); // 立即顯示數據
    } catch (error) {
      console.warn('HTTP fetch failed, will rely on WebSocket:', error);
    }

    // Step 2: Establish WebSocket subscription for real-time updates
    const handle = await this.subscriptionPort.subscribeWebData2(userAddress, callback);

    return handle;
  }
}
```

#### 組裝依賴

在 `positionComposition.tsx` 中：

```typescript
const positionService = useMemo(() => {
  const infoClient = getInfoClient();
  const subscriptionAdapter = new SubscriptionAdapter(subscriptionManager);
  const positionDataAdapter = new PositionDataAdapter(infoClient, subscriptionAdapter);
  const marketAdapter = new MarketAdapter();

  return new PositionService(positionDataAdapter, marketAdapter);
}, []);
```

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

- 使用 DataAdapter 封裝 HTTP + WS 混合邏輯
- 在 Domain Layer 保持 Pure JavaScript
- 使用 SubscriptionPort 抽象依賴
- 在 Composition Root 組裝依賴
- 為每個 subscription type 提供清晰的配置

### ❌ DON'T

- 在 Domain Layer 直接依賴 React hooks
- 在 Service 中直接調用 HTTP client
- 跳過 Port/Adapter 直接使用 infrastructure
- 在多處手動管理 AppState Lifecycle

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
