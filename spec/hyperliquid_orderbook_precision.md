# Hyperliquid Perp — Order Book 精度選單設計說明（含 TypeScript 參考實作）
作者：ChatGPT（可轉交任一 Code Agent 實作）  
版本：2025-10-28

---

## 目標
在 **Hyperliquid Perp**（MAX_DECIMALS = 6）的規則下，自動產生 **Order Book 精度選單**（每一 row 的相鄰價格差，以下稱 **step**），並回傳對應的 `nSigFigs ∈ {null, 5, 4, 3, 2}` 參數：
- `null` 代表 **full precision**（最細，但仍遵守交易所規則）；
- 其他數值代表將價格四捨五入到 **前 n 個有效位數** 所得到的顯示精度。

> 註：Spot 市場則為 MAX_DECIMALS = 8，下文提供可參數化的實作。

---

## 輸入與輸出

### 輸入
- `price`：用來判斷價格量級的**代表性價格**（詳見下一節）。
- `szDecimals`：該標的的 **size 小數位數**（來自 Hyperliquid meta 的 `szDecimals`）。
- `maxDecimals`（選）：Perp=6、Spot=8（預設 6）。

### 輸出（UI 菜單項目陣列）
每一個選單項目包含：
- `step`：相鄰 row 的價格差（數值）。
- `label`：顯示在 UI 上的字串（人眼友好，例如 `0.00001` 而非 `1e-5`）。
- `nSigFigs`：要送給 Hyperliquid 的參數（`null | 5 | 4 | 3 | 2`）。

---

## 用哪個價格作為判斷依據？

我們只需要**價格的量級（order-of-magnitude）**，理論上 `mid/mark/last` 都可；但為了穩定、避免閃爍：

1. **優先使用 `mark price`**（抗噪、較不受瞬時成交影響）。
2. 無法取得時，使用 **`top-of-book mid`** = `(bestBid + bestAsk) / 2`。
3. 再不行，用 **`last trade price`**。

### 防抖動（Hysteresis）
價格若接近 10 的整次方邊界（如 9999 ↔ 10000）可能反覆切換精度（0.1/1）。建議：
- 當重新計算精度時，僅在價格**遠離邊界**一定比例後（例如 **> 1%** 或 **> 0.5 × 當前 step**）才更新菜單。

---

## Hyperliquid 規則（Perp）回顧
- **有效位數（significant figures） ≤ 5**。  
- **整數價格永遠允許**（即使整數的有效位數 > 5）。
- **小數位數 ≤ (MAX_DECIMALS - szDecimals)**，Perp 的 `MAX_DECIMALS = 6`。

推導中會用到：
- `P`：代表性價格（上一節選出）。
- `k = floor(log10(P))`：價格的位階。
- `D = MAX_DECIMALS - szDecimals`：允許的**最大小數位數**。
- `decStep = 10^(-D)`：受小數位數上限限制的**最小步進**。
- `sfStep(n) = 10^(k - (n - 1))`：把價格取到 **n 個有效位數** 所產生的步進。

---

## 精度計算核心公式

### 1) Full precision（`nSigFigs = null`）
- 在**不違反規則**的前提下「越細越好」。同時受兩種限制：
  - 有效位數（最多 5，但整數例外）。
  - 小數位數（最多 D 位）。
- 推導結果：

```
sf5   = 10^(k - 4)      // 5 個有效位數所需的步進
dec   = 10^(-D)         // 小數位數上限導致的最小步進
if k ≥ 5:
  fullStep = 1          // 整數例外：整數價格永遠允許 → 最小可到 1
else:
  fullStep = max(sf5, dec)
```

### 2) 指定 `nSigFigs ∈ {5, 4, 3, 2}`
```
step(n) = max( 10^(k - (n - 1)), dec )
```

### 3) 菜單產生
- 先計算候選集合 `n ∈ [null, 5, 4, 3, 2]` 的步進。
- **去重**（浮點比較用小 `epsilon`）：同一步進僅保留一個項目：
  - 若包含 `null`，則保留 `null`（代表真正的 full）。
  - 否則保留**較大的 n**（更接近 full 的那個）。
- 依 `step` **由小到大**排序 → 即為 UI 菜單。

---

## 與範例對照（皆能得到一致結果）

- **BTC（szDecimals=5，P≈114971）**
  - `k=5` ⇒ `fullStep=1`（整數例外）
  - `n=5 → 10`, `n=4 → 100`, `n=3 → 1000`, `n=2 → 10000`
  - 菜單：`[1(null), 10(5), 100(4), 1000(3), 10000(2)]`

- **ETH（szDecimals=4，P≈4180.6）**
  - `k=3, D=2, dec=0.01, sf5=0.1` ⇒ `fullStep = 0.1`
  - 菜單：`[0.1(null), 1(4), 10(3), 100(2)]`

- **BNB（szDecimals=3，P≈1145.7）**
  - 類似 ETH，菜單：`[0.1(null), 1(4), 10(3), 100(2)]`

- **SOL（szDecimals=2，P≈200.48）**
  - 菜單：`[0.01(null), 0.1(4), 1(3), 10(2)]`

- **SUI（szDecimals=1，P≈2.6321）**
  - 菜單：`[0.0001(null), 0.001(4), 0.01(3), 0.1(2)]`

- **DOGE（szDecimals=0，P≈0.20359）**
  - 菜單：`[0.00001(null), 0.0001(4), 0.001(3), 0.01(2)]`

- **PUMP（szDecimals=0，P≈0.004705）**
  - `dec = 1e-6`，`sf5 = 1e-7` ⇒ full 被小數上限卡到 `1e-6`
  - `n=5` 也會被抬到 `1e-6`
  - `n=4 → 1e-6`, `n=3 → 1e-5`, `n=2 → 1e-4`
  - 去重後菜單：`[0.000001(null), 0.00001(3), 0.0001(2)]`

---

## TypeScript 參考實作

> 本實作為純函式，不含 UI；已參數化 `maxDecimals` 以支援 Spot（8）。

```ts
// types.ts
export type NSig = 2 | 3 | 4 | 5 | null;

export interface MenuItem {
  step: number;     // 相鄰 row 的價格差
  label: string;    // UI 顯示文字
  nSigFigs: NSig;   // 送給 Hyperliquid 的參數
}

export interface BuildMenuOptions {
  maxDecimals?: number; // Perp=6, Spot=8
}
```

```ts
// precision.ts
import type { NSig, MenuItem, BuildMenuOptions } from "./types";

const DEFAULT_MAX_DECIMALS_PERP = 6;

function decimalsStep(szDecimals: number, maxDecimals = DEFAULT_MAX_DECIMALS_PERP): number {
  const D = Math.max(0, maxDecimals - szDecimals);
  return Math.pow(10, -D);
}

function sigStepByN(price: number, n: Exclude<NSig, null>): number {
  const k = Math.floor(Math.log10(Math.abs(price)));
  return Math.pow(10, k - (n - 1));
}

function fullStep(price: number, szDecimals: number, maxDecimals = DEFAULT_MAX_DECIMALS_PERP): number {
  const k = Math.floor(Math.log10(Math.abs(price)));
  const dec = decimalsStep(szDecimals, maxDecimals);
  const sf5 = Math.pow(10, k - 4); // 5 significant figures
  // Integer exception: integer prices are always allowed
  if (k >= 5) return 1;
  return Math.max(sf5, dec);
}

function stepFor(price: number, szDecimals: number, n: NSig, maxDecimals = DEFAULT_MAX_DECIMALS_PERP): number {
  if (n === null) return fullStep(price, szDecimals, maxDecimals);
  return Math.max(sigStepByN(price, n), decimalsStep(szDecimals, maxDecimals));
}

function approxEqual(a: number, b: number): boolean {
  const eps = 1e-12;
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= eps * scale;
}

function toLabel(step: number): string {
  if (step >= 1) return String(Math.trunc(step));
  // render as decimal instead of scientific notation
  let decimals = 0;
  let s = step;
  while (s < 1 && decimals < 10) { s *= 10; decimals++; }
  return step.toFixed(decimals).replace(/0+$/,'').replace(/\.$/,'') || "0";
}

export function buildPrecisionMenu(
  price: number,
  szDecimals: number,
  opts?: BuildMenuOptions
): MenuItem[] {
  if (!(price > 0)) throw new Error("price must be > 0");
  const maxDecimals = opts?.maxDecimals ?? DEFAULT_MAX_DECIMALS_PERP;

  const candidates: { n: NSig; step: number }[] =
    [null, 5, 4, 3, 2].map((n) => ({
      n: n as NSig,
      step: stepFor(price, szDecimals, n as NSig, maxDecimals),
    }));

  // deduplicate: prefer null (full) if present; otherwise prefer larger n
  const unique = new Map<number, { n: NSig; step: number }>();
  for (const { n, step } of candidates) {
    let keyHit: number | undefined;
    for (const key of unique.keys()) {
      if (approxEqual(key, step)) { keyHit = key; break; }
    }
    if (keyHit === undefined) {
      unique.set(step, { n, step });
    } else {
      const cur = unique.get(keyHit)!;
      if (cur.n === null) continue;
      if (n === null) {
        unique.set(keyHit, { n, step: keyHit });
      } else if (typeof cur.n === "number" && typeof n === "number" && n > cur.n) {
        unique.set(keyHit, { n, step: keyHit });
      }
    }
  }

  return Array.from(unique.values())
    .sort((a, b) => a.step - b.step)
    .map(({ n, step }) => ({ step, label: toLabel(step), nSigFigs: n }));
}
```

```ts
// price-source.ts (建議用法 / 非必要）
export interface PriceSource {
  mark?: number;
  bestBid?: number;
  bestAsk?: number;
  last?: number;
}

export function representativePrice(src: PriceSource): number {
  if (src.mark && src.mark > 0) return src.mark;
  if (src.bestBid && src.bestAsk && src.bestBid > 0 && src.bestAsk > 0) {
    return (src.bestBid + src.bestAsk) / 2;
  }
  if (src.last && src.last > 0) return src.last;
  throw new Error("No valid price source");
}
```

```ts
// hysteresis.ts（選擇性：防止在 10 的冪邊界抖動）
export interface HysteresisState {
  lastMenu?: string;   // JSON stringified menu items
  lastAnchorK?: number;
}

export function shouldRecomputeMenu(
  price: number,
  step: number,
  prevPrice: number | undefined
): boolean {
  if (!prevPrice) return true;
  const movedEnough = Math.abs(price - prevPrice) > Math.max(step * 0.5, price * 0.01);
  return movedEnough;
}
```

---

## 使用範例

```ts
import { buildPrecisionMenu } from "./precision";
import { representativePrice } from "./price-source";

// 例：BTC
const P_btc = representativePrice({ mark: 114_971 });
const menu_btc = buildPrecisionMenu(P_btc, /* szDecimals */ 5);
// menu_btc => [
//   { step: 1,     label: "1",     nSigFigs: null },
//   { step: 10,    label: "10",    nSigFigs: 5    },
//   { step: 100,   label: "100",   nSigFigs: 4    },
//   { step: 1000,  label: "1000",  nSigFigs: 3    },
//   { step: 10000, label: "10000", nSigFigs: 2    },
// ]
```

---

## 單元測試建議（節錄）

```ts
import { buildPrecisionMenu } from "./precision";

it("BTC sz=5 @114971", () => {
  const m = buildPrecisionMenu(114971, 5);
  expect(m.map(x => x.label)).toEqual(["1","10","100","1000","10000"]);
  expect(m[0].nSigFigs).toBeNull();
});

it("ETH sz=4 @4180.6", () => {
  const m = buildPrecisionMenu(4180.6, 4);
  expect(m.map(x => x.label)).toEqual(["0.1","1","10","100"]);
  expect(m[0].nSigFigs).toBeNull();
});

it("SOL sz=2 @200.48", () => {
  const m = buildPrecisionMenu(200.48, 2);
  expect(m.map(x => x.label)).toEqual(["0.01","0.1","1","10"]);
});

it("DOGE sz=0 @0.20359", () => {
  const m = buildPrecisionMenu(0.20359, 0);
  expect(m.map(x => x.label)).toEqual(["0.00001","0.0001","0.001","0.01"]);
});

it("PUMP sz=0 @0.004705", () => {
  const m = buildPrecisionMenu(0.004705, 0);
  expect(m.map(x => x.label)).toEqual(["0.000001","0.00001","0.0001"]);
  expect(m.find(x=>x.label==="0.000001")!.nSigFigs).toBeNull(); // full 被 dec 限制
});
```

---

## 常見邊界與注意事項

1. **整數例外（k ≥ 5）**：BTC 這種高價位標的，`fullStep` 應為 `1`。
2. **小數上限卡住**：超小價位或 `szDecimals` 偏小時，`decStep` 會把 `null/5/4` 壓成同一個步進（如 PUMP）。
3. **去重策略**：同一步進保留 `null`；若無 `null`，保留**較大的 n**（更接近 full）。
4. **浮點比對**：使用 `epsilon`（如 `1e-12`）避免 0.30000000000004 類誤差。
5. **Spot 支援**：傳入 `maxDecimals=8` 即可沿用同一套邏輯：
   - `buildPrecisionMenu(price, szDecimals, { maxDecimals: 8 })`。
6. **UI 標籤**：人眼友好字串比科學記號好辨識；`toLabel` 以動態小數位輸出。

---

## 摘要（給 Code Agent 的待辦）
- [ ] 提供 `representativePrice()` 以 `mark→mid→last` 優先序取得價格。
- [ ] 以本文公式實作 `buildPrecisionMenu()`；支援 Perp（6）與 Spot（8）。
- [ ] 完成 **去重** 與 **排序**，並輸出 `[{step,label,nSigFigs}]`。
- [ ] 視需要加上 **hysteresis**，避免邊界抖動。
- [ ] 對照：BTC/ETH/BNB/SOL/SUI/PUMP/DOGE 測試樣本應符合本文示例。

---

## 版權
本文與程式碼授權為 MIT，可自由使用與修改。
