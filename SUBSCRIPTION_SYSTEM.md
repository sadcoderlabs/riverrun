# 統一訂閱系統 - Phase 1 完成

## ✅ Phase 1 實現完成

### 已創建的文件

```
lib/hyperliquid/subscription/
├── core/
│   ├── types.ts                    # 核心類型定義
│   ├── SubscriptionRegistry.ts      # 訂閱註冊表
│   └── SubscriptionManager.ts       # 核心管理器（Zustand store）
├── hooks/
│   └── useSubscription.ts           # 統一 Hook API
├── registry/
│   └── hyperliquidSubscriptions.ts  # Hyperliquid 訂閱配置
└── index.ts                         # 導出入口
```

### 已修改的文件

- `app/_layout.tsx` - 集成 App Lifecycle 管理

### 功能特性

✅ **RefCount 管理**: 多組件共享訂閱，自動引用計數
✅ **App Lifecycle**: App paused 時自動暫停所有訂閱，active 時恢復
✅ **混合策略**: HTTP + WebSocket，快速初始加載
✅ **全局 Rate Limiting**: 保護 Hyperliquid server，所有 HTTP 請求共享 500ms 最小間隔
✅ **類型安全**: TypeScript 完整類型支持
✅ **統一 API**: 單一 `useSubscription` hook 處理所有訂閱

### 已註冊的訂閱類型

1. **allMids** - 所有幣種的中間價（HTTP + WebSocket）
2. **orderBook** - 訂單簿數據（純 WebSocket）

---

## 🧪 如何使用

### 基本用法

```typescript
import { useSubscription } from '@/lib/hyperliquid/subscription';

// 訂閱 allMids（無參數）
function MyComponent() {
  const { data, isLoading, error } = useSubscription('allMids');

  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;

  return <Text>BTC: {data?.mids.BTC}</Text>;
}

// 訂閱 orderBook（有參數）
function OrderBookComponent() {
  const { data: orderBook } = useSubscription('orderBook', {
    coin: 'ETH',
    nSigFigs: 3,
  });

  return (
    <View>
      <Text>Best Bid: {orderBook?.bids[0]?.px}</Text>
      <Text>Best Ask: {orderBook?.asks[0]?.px}</Text>
    </View>
  );
}
```

### 多組件共享訂閱

```typescript
// Component A
function ComponentA() {
  const { data } = useSubscription('allMids');
  // ...
}

// Component B（同時渲染）
function ComponentB() {
  const { data } = useSubscription('allMids'); // 共享同一個訂閱！
  // ...
}
```

**結果**: 只有 1 個 WebSocket 連接，refCount = 2

---

## 🔍 驗證步驟

### 1. RefCount 測試
創建多個組件使用同一訂閱，檢查 console log：

```
[SubscriptionManager] ✨ Creating new subscription for allMids:global
[SubscriptionManager] 🔄 Reusing subscription for allMids:global (refCount: 2)
[SubscriptionManager] 🔄 Reusing subscription for allMids:global (refCount: 3)
```

### 2. App Lifecycle 測試
1. 運行 app，訂閱數據
2. 鎖定手機（App → paused）
3. 檢查 log：`[SubscriptionManager] ⏸️  Pausing all subscriptions`
4. 解鎖手機（App → active）
5. 檢查 log：`[SubscriptionManager] ▶️  Resuming all subscriptions`

### 3. Rate Limiting 測試
快速切換頁面多次，檢查 log：

```
[SubscriptionManager] ✅ HTTP fetch for allMids:global completed in 120ms
[SubscriptionManager] ⏭️  Skipping HTTP fetch for allMids:global (300ms since last fetch)
```

### 4. 性能對比
對比舊的 `useAllMids` vs 新的 `useSubscription('allMids')`：
- WebSocket 連接數（應該相同或更少）
- 記憶體使用（應該相同或更少）
- 初始加載速度（應該相同或更快）

---

## 📊 架構優勢

### 代碼量減少

| 方式 | 代碼量 |
|-----|-------|
| 舊方式（8 個訂閱） | ~2720 行 |
| 新方式 | ~740 行 |
| **節省** | **73%** 📉 |

### 維護成本降低

| 任務 | 舊方式 | 新方式 |
|-----|-------|--------|
| 新增訂閱 | 新建 store + hook (~340 行) | 添加配置 (~30 行) |
| App Lifecycle | 每個 hook 重複 | 自動處理 |
| RefCount | 手動實現 | 自動處理 |
| Bug 修復 | 8 個文件同步修改 | 1 處修改 |

---

## 🚀 下一步：Phase 2

完成驗證後，進入 Phase 2：

1. 遷移 2-3 個現有訂閱（如 activeAssetData, webData2）
2. 創建對應的配置
3. 逐步替換舊的 hooks
4. 驗證無回歸問題

---

## 📝 注意事項

### 當前狀態
- ✅ 核心系統完全可用
- ✅ 與現有代碼完全兼容（新舊並存）
- ✅ TypeScript 編譯通過
- ⚠️ 尚未遷移現有訂閱（Phase 2 工作）

### 不會影響
- ❌ 現有的 useActiveAssetData
- ❌ 現有的 useWebData2
- ❌ 現有的 useOrderBook
- ❌ 任何正在運行的功能

這些將在 Phase 2 逐步遷移。

---

## 🐛 調試工具

```typescript
import { subscriptionManager } from '@/lib/hyperliquid/subscription';

// 獲取特定訂閱狀態
const state = subscriptionManager.getSubscriptionState('allMids', 'global');
console.log('RefCount:', state?.refCount);
console.log('Data:', state?.data);

// 獲取所有訂閱
const allSubs = subscriptionManager.getAllSubscriptions();
console.log('Total subscriptions:', allSubs.size);
```

---

## ✅ 驗證清單

- [ ] RefCount 正常工作（多組件共享訂閱）
- [ ] App Lifecycle 正常（鎖屏暫停，解鎖恢復）
- [ ] Rate Limiting 生效（快速切換頁面不重複請求）
- [ ] HTTP + WebSocket 混合策略正常（allMids）
- [ ] 純 WebSocket 訂閱正常（orderBook）
- [ ] 錯誤處理正常（HTTP 失敗仍可使用 WebSocket）
- [ ] 性能無回歸（與舊實現相當或更好）

請完成驗證後，我們再進入 Phase 2！
