# Phase 2 Handover - 統一訂閱系統

## 📋 工作總結

### Phase 1：核心系統（已完成 ✅）
- 創建統一訂閱系統基礎設施
- 實現 SubscriptionManager（RefCount + App Lifecycle + Global Rate Limiting）
- 註冊 2 個示範訂閱：allMids, orderBook

### Phase 2：遷移現有訂閱（已完成 ✅）
- 遷移 3 個訂閱：userFills, webData2, activeAssetData
- 創建 `.v2` hooks 使用統一訂閱系統
- 添加測試組件到 `/test-subscription`

---

## 🗂️ 文件清單

### ✅ 已創建的文件

#### 核心系統 (Phase 1)
```
lib/hyperliquid/subscription/
├── core/
│   ├── types.ts                     # 核心類型定義
│   ├── SubscriptionRegistry.ts      # 訂閱註冊表
│   └── SubscriptionManager.ts       # 核心管理器（RefCount + Lifecycle + Rate Limiting）
├── hooks/
│   └── useSubscription.ts           # 統一 Hook API
├── registry/
│   └── hyperliquidSubscriptions.ts  # 訂閱配置（5 個訂閱）
└── index.ts                         # 導出入口
```

#### 新 Hooks (Phase 2)
```
lib/hyperliquid/hooks/
├── useUserFills.v2.ts           # 使用統一訂閱系統（含去重邏輯）
├── useWebData2.v2.ts            # 使用統一訂閱系統（含數據計算）
└── useActiveAssetData.v2.ts     # 使用統一訂閱系統（移除了整個 store！）
```

#### 測試和文檔
```
app/
└── test-subscription.tsx        # 測試頁面（6 個測試組件）

SUBSCRIPTION_SYSTEM.md           # 完整文檔
PHASE_2_HANDOVER.md             # 本文件
```

### ✏️ 已修改的文件

```
app/_layout.tsx                  # 添加 App Lifecycle 集成
app/(modal)/settings/index.tsx   # 添加測試入口按鈕
```

---

## 🎯 已註冊的訂閱配置

**文件**: `lib/hyperliquid/subscription/registry/hyperliquidSubscriptions.ts`

| # | 訂閱類型 | Key 生成 | HTTP | WebSocket | 行號 |
|---|---------|---------|------|-----------|------|
| 1 | **allMids** | `'global'` | ✅ | ✅ | 49-59 |
| 2 | **orderBook** | `${coin}-${nSigFigs}` | ❌ | ✅ | 65-91 |
| 3 | **userFills** | `${user}` | ✅ | ✅ | 99-133 |
| 4 | **webData2** | `${user}` | ✅ | ✅ | 148-170 |
| 5 | **activeAssetData** | `${user}-${coin}` | ✅ | ✅ | 195-221 |

---

## 🔑 關鍵設計決策

### 1️⃣ 全局 Rate Limiting（重要改進！）

**問題**：原設計是每個訂閱配置自己的 `rateLimitMs`
```typescript
// ❌ 舊設計
subscriptionRegistry.register('allMids', {
  rateLimitMs: 1000  // 每個訂閱獨立限制
});
```

**用戶建議**：所有 HTTP 請求都通過 `infoClient` 發送到同一個 Hyperliquid server，應該全局限制。

**解決方案**：
```typescript
// ✅ 新設計：SubscriptionManager.ts:39-40
private lastGlobalHttpFetch = 0;
private readonly GLOBAL_HTTP_MIN_INTERVAL = 500; // 500ms 全局最小間隔
```

**效果**：
- 保護 Hyperliquid server 免受快速併發請求
- 簡化配置（移除 `rateLimitMs` 配置）
- 所有 HTTP 請求共享 500ms 限制

### 2️⃣ activeAssetData 簡化（最大成就！）

**舊實現**：
- `useActiveAssetDataStore.ts` - 240 行（Zustand store + RefCount）
- `useActiveAssetData.ts` - 100 行（Hook）
- **總計 340 行**

**新實現**：
- `useActiveAssetData.v2.ts` - **僅 50 行**！
- **移除 290 行代碼（-85%）**

**原因**：所有複雜邏輯（RefCount, HTTP+WS, Rate Limiting, App Lifecycle）已在核心系統處理。

### 3️⃣ 數據轉換邏輯放在 Hook 層

**決策**：保持 Registry 簡單，複雜邏輯在專門的 hook 處理

**示例 - webData2**：
- Registry：只負責 HTTP fetch + WebSocket subscribe
- Hook：負責計算 `totalAccountValue`, `perpBalance`, `crossMarginRatio` 等

**優點**：
- Registry 配置簡潔易讀
- Hook 可以自定義數據處理邏輯
- 更好的關注點分離

### 4️⃣ 向後兼容策略

**方法**：創建 `.v2` 文件，保留舊文件不動

**優點**：
- 零破壞性更改
- 新舊系統可以並存
- 可以逐步遷移
- 隨時可以回退

**文件對比**：
```
useUserFills.ts       # 舊版本（保留）
useUserFills.v2.ts    # 新版本（Phase 2）
```

---

## 🧪 測試頁面

**路徑**: `/test-subscription`
**入口**: Settings → Developer → Test Subscription System

### 測試組件列表

| # | 組件名稱 | 測試目的 | 樣式 |
|---|---------|---------|------|
| 1 | AllMidsTest1 | HTTP + WebSocket | 無邊框 |
| 2 | AllMidsTest2 | RefCount = 2（共享訂閱） | 無邊框 |
| 3 | OrderBookTest | 純 WebSocket | 無邊框 |
| 4 | UserFillsTest | Phase 2 - userFills | 綠色邊框 |
| 5 | WebData2Test | Phase 2 - webData2 | 綠色邊框 |
| 6 | ActiveAssetDataTest | Phase 2 - activeAssetData | 綠色邊框 |

### 預期 Console Output（待驗證）

```javascript
// 初始加載
[SubscriptionManager] ✨ Creating new subscription for allMids:global
[SubscriptionManager] ✅ HTTP fetch for allMids:global completed in ~80-150ms
[SubscriptionManager] 🔄 Reusing subscription for allMids:global (refCount: 2)
[SubscriptionManager] ✨ Creating new subscription for orderBook:BTC-2
[SubscriptionManager] ✨ Creating new subscription for userFills:{user-address}
[SubscriptionManager] ✅ HTTP fetch for userFills:{user-address} completed in ~100ms
[SubscriptionManager] ✨ Creating new subscription for webData2:{user-address}
[SubscriptionManager] ⏭️  Skipping HTTP fetch for webData2:{user-address} (global rate limit: 300ms < 500ms)
[SubscriptionManager] ✨ Creating new subscription for activeAssetData:{user-address}-ETH
[SubscriptionManager] ⏭️  Skipping HTTP fetch for activeAssetData:{user-address}-ETH (global rate limit: 400ms < 500ms)

// 離開頁面（cleanup）
[SubscriptionManager] 📉 Decremented refCount for allMids:global (refCount: 1)
[SubscriptionManager] 🧹 Cleaning up subscription for allMids:global
[SubscriptionManager] 🧹 Cleaning up subscription for orderBook:BTC-2
[SubscriptionManager] 🧹 Cleaning up subscription for userFills:{user-address}
[SubscriptionManager] 🧹 Cleaning up subscription for webData2:{user-address}
[SubscriptionManager] 🧹 Cleaning up subscription for activeAssetData:{user-address}-ETH

// 鎖定手機
[SubscriptionManager] ⏸️  Pausing all subscriptions
[SubscriptionManager] ⏸️  Paused allMids:global
[SubscriptionManager] ⏸️  Paused orderBook:BTC-2
[SubscriptionManager] ⏸️  Paused userFills:{user-address}
[SubscriptionManager] ⏸️  Paused webData2:{user-address}
[SubscriptionManager] ⏸️  Paused activeAssetData:{user-address}-ETH

// 解鎖手機
[SubscriptionManager] ▶️  Resuming all subscriptions
[SubscriptionManager] ▶️  Resumed allMids:global
[SubscriptionManager] ▶️  Resumed orderBook:BTC-2
[SubscriptionManager] ▶️  Resumed userFills:{user-address}
[SubscriptionManager] ▶️  Resumed webData2:{user-address}
[SubscriptionManager] ▶️  Resumed activeAssetData:{user-address}-ETH
```

---

## ✅ Phase 2 驗證清單

### 功能驗證

- [ ] **RefCount 測試**
  - AllMidsTest1 和 AllMidsTest2 共享訂閱
  - Console 顯示：`🔄 Reusing subscription for allMids:global (refCount: 2)`

- [ ] **全局 Rate Limiting 測試**
  - 快速連續創建多個訂閱
  - 第 2+ 個 HTTP 請求應該被跳過
  - Console 顯示：`⏭️ Skipping HTTP fetch ... (global rate limit: Xms < 500ms)`

- [ ] **HTTP + WebSocket 混合策略**
  - allMids, userFills, webData2, activeAssetData 應該先顯示 HTTP 數據
  - 然後 WebSocket 接管實時更新
  - Console 顯示：`✅ HTTP fetch for ... completed in ~100ms`

- [ ] **純 WebSocket 訂閱**
  - orderBook 應該只使用 WebSocket（無 HTTP）
  - 數據仍能正常顯示

- [ ] **App Lifecycle 管理**
  - 鎖定手機 → Console 顯示 `⏸️ Pausing all subscriptions`
  - 解鎖手機 → Console 顯示 `▶️ Resuming all subscriptions`
  - 訂閱數據應該在解鎖後恢復更新

- [ ] **Cleanup 機制**
  - 離開測試頁面 → Console 顯示 `🧹 Cleaning up subscription for ...`
  - 無記憶體洩漏

- [ ] **數據正確性**
  - UserFills: 顯示正確的 fills 數量和最新 fill
  - WebData2: 顯示正確的賬戶餘額
  - ActiveAssetData: 顯示正確的 ETH leverage 和價格

### 性能驗證

- [ ] **初始加載速度**
  - HTTP fetch 完成時間 < 200ms
  - 數據顯示無明顯延遲

- [ ] **WebSocket 連接數**
  - 6 個組件應該只建立 5 個 WebSocket 連接（allMids 共享）

- [ ] **記憶體使用**
  - 反復進入/離開測試頁面
  - 記憶體應該穩定，無持續增長

---

## 🔍 重要發現和注意事項

### 1. userFills WebSocket 回調特殊處理

**文件**: `hyperliquidSubscriptions.ts:117-130`

```typescript
// WebSocket 發送 { fills: Fill[], isSnapshot: boolean }
// isSnapshot=true: 初始快照（已由 HTTP 獲取，跳過）
// isSnapshot=false: 實時更新（需要處理）
if (data.fills && data.fills.length > 0 && !data.isSnapshot) {
  callback({ fills: data.fills as Fill[] });
}
```

**注意**：去重邏輯在 `useUserFills.v2.ts` 的 `useEffect` 中處理。

### 2. WebData2 數據計算邏輯

**文件**: `useWebData2.v2.ts:70-160`

所有計算邏輯（`calculateSpotValue`, `totalAccountValue`, `perpBalance` 等）都保留在 hook 中，確保向後兼容。

### 3. activeAssetData 驚人的簡化

舊版本需要：
- Zustand store 管理 subscriptions Map
- 手動 RefCount 管理
- 手動 HTTP rate limiting
- 手動 cleanup

新版本只需：
```typescript
const { data, isLoading, error } = useSubscription('activeAssetData', {
  user: wallet?.address,
  coin,
});
```

**所有複雜邏輯自動處理！**

### 4. App Lifecycle 集成位置

**文件**: `app/_layout.tsx:39-48`

```typescript
useEffect(() => {
  if (appState === 'active') {
    void subscriptionManager.resumeAll();
  } else if (appState === 'paused') {
    void subscriptionManager.pauseAll();
  }
}, [appState]);
```

**重要**：這是全局唯一的 App Lifecycle 監聽點，控制所有訂閱。

### 5. TypeScript 編譯狀態

✅ **所有文件通過 TypeScript 編譯**（`pnpm tsc --noEmit`）

唯一的 ESLint warning：
```
hyperliquidSubscriptions.ts:19:11
⚠ [Line 19:11] An empty interface declaration
```

已修復：添加 `// eslint-disable-next-line @typescript-eslint/no-empty-object-type`

---

## 📊 代碼量統計

### Phase 1 (核心系統)
- `types.ts`: ~85 行
- `SubscriptionRegistry.ts`: ~50 行
- `SubscriptionManager.ts`: ~330 行
- `useSubscription.ts`: ~80 行
- `hyperliquidSubscriptions.ts` (初始): ~100 行
- `index.ts`: ~40 行
- **小計**: ~685 行

### Phase 2 (遷移 3 個訂閱)
- Registry 新增配置: ~90 行（3 × 30 行）
- `useUserFills.v2.ts`: ~90 行
- `useWebData2.v2.ts`: ~160 行
- `useActiveAssetData.v2.ts`: ~50 行
- **小計**: ~390 行

### Phase 1 + 2 總計
- **~1075 行**（含測試頁面和文檔）

### 與舊實現對比
- 舊實現（5 個訂閱）: ~1030 行
- 新實現（5 個訂閱 + 核心系統）: ~1075 行
- **差異**: +45 行（+4%）

**但未來新增訂閱只需 ~30 行配置！**

### activeAssetData 對比（最大亮點）
- 舊：340 行
- 新：50 行
- **減少：290 行（-85%）** 🎉

---

## 🚀 下一步建議

### 選項 A：驗證 Phase 2（推薦）
1. 運行 app，導航到 `/test-subscription`
2. 檢查 console logs 與預期是否一致
3. 測試 App Lifecycle（鎖屏/解鎖）
4. 驗證 RefCount 和 Rate Limiting

### 選項 B：Phase 3 - 遷移剩餘訂閱
剩餘訂閱（如果需要）：
- `orderUpdates` - 訂單更新
- `trades` - 交易歷史
- `activeAssetCtx` - 資產上下文

### 選項 C：實際應用
1. 在實際頁面中使用 `.v2` hooks
2. 逐步替換舊 hooks
3. 確認無回歸問題
4. 刪除舊文件和 store

### 選項 D：優化和清理
1. 移除舊的 `useAllMids` 和 `useOrderBook`（已被 registry 替代）
2. 更新文檔
3. 添加更多測試用例
4. 性能優化

---

## 🔧 Phase 2.5 - 修復 iOS Face ID Lock Screen 問題

### 問題描述

**發現時間**: Phase 2 驗證期間

**現象**: 鎖屏時會意外觸發 `resumeAll()`，導致訂閱被短暫恢復然後又暫停

**Console Log**:
```
⏸️ Pausing all subscriptions
▶️ Resuming all subscriptions  ⚠️ 不應該在鎖屏時發生！
⏸️ Pausing all subscriptions
```

### 根本原因分析

#### 原因 1：重複的 AppState 監聽器（7 個！）
- `_layout.tsx` 中有 1 個 `useAppLifecycle()`
- `useSubscription.ts` 中每個實例也調用 `useAppLifecycle()`
- 測試頁面有 6 個組件 → 總共 **7 個監聽器**

#### 原因 2：iOS Face ID 的 AppState 抖動
iOS 鎖屏時的 AppState 序列：
```
1. active → inactive        (準備鎖屏)
2. inactive → active        (Face ID 識別中) ⚠️ 短暫回到 active！
3. active → inactive        (確認鎖屏)
4. inactive → background    (完全進入後台)
```

**為什麼會抖動**：
- iOS 的 `inactive` 是過渡態：進入控制中心、來電、鎖屏動畫時都會先變 `inactive`
- Face ID／注意力偵測：按下側鍵後，若臉部已被偵測，系統會短暫讓 App 回到 `active`（解鎖過程），接著又馬上進 `inactive`/`background`

### 修復方案

#### 修復 1：移除重複監聽器 ✅
- **文件**: `lib/hyperliquid/subscription/hooks/useSubscription.ts:1-2, 47`
- **修改**: 移除 `useAppLifecycle` import 和使用
- **效果**: 從 7 個監聽器減少到 1 個（只在 `_layout` 中）

**修改前**:
```typescript
import { useAppLifecycle } from '../../hooks/useAppLifecycle';

export function useSubscription<TData = any>(type: string, params?: any) {
  const appState = useAppLifecycle();  // ❌ 每個組件都創建監聽器

  useEffect(() => {
    if (appState !== 'active') return;  // ❌ 依賴 appState
    // ...
  }, [type, params, appState]);
}
```

**修改後**:
```typescript
// ✅ 移除 useAppLifecycle import

export function useSubscription<TData = any>(type: string, params?: any) {
  // ✅ 不再監聽 appState

  useEffect(() => {
    // ✅ 直接訂閱，App Lifecycle 由 _layout 統一管理
    // ...
  }, [type, serializedParams]);
}
```

#### 修復 2：添加 Resume 防抖（200ms）✅
- **文件**: `lib/hyperliquid/hooks/useAppLifecycle.ts:56, 64-101`
- **修改**: Resume 延遲 200ms，Pause 保持立即執行
- **效果**: 過濾 iOS Face ID 的短暫 active 狀態

**防抖邏輯**:
```typescript
const resumeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// App going to background
if (nextAppState.match(/inactive|background/)) {
  // Cancel any pending resume (重要！)
  if (resumeDebounceRef.current) {
    clearTimeout(resumeDebounceRef.current);
    resumeDebounceRef.current = null;
  }

  setAppState('paused');  // ✅ 立即暫停（省電優先）
}

// App coming to foreground
if (nextAppState === 'active') {
  // Debounce resume（防抖）
  resumeDebounceRef.current = setTimeout(() => {
    setAppState('active');  // ✅ 只有穩定保持 active 200ms 才恢復
  }, 200);
}
```

### 驗證結果 ✅

#### 鎖屏時（完美！）
```
[useAppLifecycle] 📱 RN AppState: active → inactive
⏸️ Pausing all subscriptions

[useAppLifecycle] 📱 RN AppState: inactive → active
⬆️ App coming to foreground → debouncing (200ms)...

[useAppLifecycle] 📱 RN AppState: active → inactive
🚫 Cancelled pending resume (lock screen flicker)

[useAppLifecycle] 📱 RN AppState: inactive → background
✅ 沒有觸發 resumeAll()
```

#### 解鎖時（完美！）
```
[useAppLifecycle] 📱 RN AppState: background → active
⬆️ App coming to foreground → debouncing (200ms)...
(等待 200ms)
✅ App is stable at "active" → resuming
▶️ Resuming all subscriptions
```

### 技術要點

1. **Pause 不需要防抖**：進入後台時應該立即暫停訂閱，節省電池優先
2. **Resume 需要防抖**：避免 Face ID 的短暫 active 觸發不必要的恢復
3. **200ms 是最佳值**：
   - 足夠快，用戶無感知延遲
   - 足夠慢，能過濾 Face ID 抖動
4. **取消機制很關鍵**：進入後台時必須取消 pending 的 resume

### 相關文件

- `lib/hyperliquid/subscription/hooks/useSubscription.ts` - 移除 appState 依賴
- `lib/hyperliquid/hooks/useAppLifecycle.ts` - 添加 resume 防抖
- `app/_layout.tsx` - 唯一的 App Lifecycle 管理點

---

## 🐛 已知問題和限制

### 1. 舊 hooks 仍在使用中
- `useActiveAssetData.ts` (舊版本)
- `useWebData2.ts` (舊版本)
- `useUserFills.ts` (舊版本)

**狀態**: 保留用於向後兼容，實際頁面尚未遷移到 `.v2`

### 2. WebSocket 錯誤恢復

**當前行為**: WebSocket 連接失敗時會 log 錯誤，但不會自動重試
**位置**: `SubscriptionManager.ts:179-200`

**建議**: 未來可以添加自動重連邏輯

---

## 📝 重要代碼位置速查

### 核心邏輯
- **全局 Rate Limiting**: `SubscriptionManager.ts:39-40, 132-177`
- **RefCount 管理**: `SubscriptionManager.ts:72-90, 239-262`
- **App Lifecycle**: `SubscriptionManager.ts:269-348`
- **訂閱註冊**: `hyperliquidSubscriptions.ts`

### Hook 實現
- **useSubscription**: `useSubscription.ts:53-82`
- **useUserFills.v2**: `useUserFills.v2.ts:66-81`
- **useWebData2.v2**: `useWebData2.v2.ts:72-175`
- **useActiveAssetData.v2**: `useActiveAssetData.v2.ts:54-66`

### 測試
- **測試頁面**: `app/test-subscription.tsx`
- **測試入口**: `app/(modal)/settings/index.tsx:111-121`

### 文檔
- **完整文檔**: `SUBSCRIPTION_SYSTEM.md`
- **Handover**: `PHASE_2_HANDOVER.md` (本文件)

---

## 🎯 驗證時重點關注

### 1. 全局 Rate Limiting 是否生效
**關鍵 log**:
```
⏭️ Skipping HTTP fetch for ... (global rate limit: Xms < 500ms)
```

**測試方法**: 快速進入測試頁面，應該只有第一個訂閱發 HTTP，其他被限制。

### 2. RefCount 是否正確
**關鍵 log**:
```
🔄 Reusing subscription for allMids:global (refCount: 2)
📉 Decremented refCount for allMids:global (refCount: 1)
🧹 Cleaning up subscription for allMids:global
```

**測試方法**: AllMidsTest1 和 AllMidsTest2 應該共享訂閱。

### 3. App Lifecycle 是否工作
**關鍵 log**:
```
⏸️ Pausing all subscriptions
▶️ Resuming all subscriptions
```

**測試方法**: 鎖屏/解鎖，觀察 console。

### 4. 數據完整性
**檢查點**:
- UserFills 顯示的 fills 數量是否正確
- WebData2 顯示的餘額是否正確
- ActiveAssetData 顯示的 leverage 是否正確

---

## 💡 給下一位接手者的建議

1. **先運行測試頁面** (`/test-subscription`)，觀察 console logs，確認基本功能正常

2. **重點驗證全局 Rate Limiting**，這是 Phase 2 的重要改進

3. **測試 App Lifecycle**，鎖屏/解鎖應該能看到暫停/恢復的 logs

4. **如果發現問題**：
   - 檢查 `SubscriptionManager.ts` 的全局 rate limiting 邏輯
   - 檢查 `app/_layout.tsx` 的 App Lifecycle 集成
   - 檢查 `hyperliquidSubscriptions.ts` 的訂閱配置

5. **如果一切正常**：
   - 可以考慮 Phase 3（遷移剩餘訂閱）
   - 或開始在實際頁面使用 `.v2` hooks

---

## 📞 聯繫信息

**原始對話 context**: ~119k tokens used
**TypeScript 編譯**: ✅ 通過
**Git 狀態**: 所有更改已 stage（未 commit）

**下一步**: 等待用戶提供 Phase 2 Console output 進行驗證 🧪
