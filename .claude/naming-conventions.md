# File Naming Conventions

This project adopts a purpose-based naming strategy that follows common practices in the JavaScript/React community. The core principle is: **name files to reflect their primary export**.

## Naming Rules

### 1. Route Files (App Router)

**Use kebab-case**

Route files are located in the `app/` directory. Since file names directly affect URL paths, they should follow URL conventions using kebab-case (dash-separated):

```
✅ app/login.tsx
✅ app/export-wallet.tsx
✅ app/approval-status.tsx
✅ app/(main)/deposit/deposit-hl-bridge.tsx

Special files (Expo Router conventions):
✅ app/_layout.tsx
✅ app/[coin]/index.tsx
```

**Rationale**: File names become part of URLs and should follow web URL kebab-case conventions. These are configuration files rather than regular code files, and they're user-visible.

### 2. React Component Files

**Use PascalCase**

All files that export React Components should use PascalCase, matching the component name:

```
✅ components/home/WalletInfo.tsx
   export const WalletInfo = () => {}

✅ components/trade/MarketListItem.tsx
   export const MarketListItem = () => {}

✅ components/settings/ExportWalletModal.tsx
   export const ExportWalletModal = () => {}
```

**Rationale**: React Components must be named in PascalCase. When file names match their primary export, it improves code readability and maintainability.

### 3. General TypeScript Files

**Use camelCase**

This includes hooks, utilities, services, types, and other non-component files:

```
✅ lib/hyperliquid/hooks/useOrderBook.ts
   export const useOrderBook = () => {}

✅ lib/hyperliquid/utils/marketUtils.ts
   export const formatPrice = () => {}

✅ lib/hyperliquid/client.ts
   export class HyperliquidClient {}

✅ lib/hyperliquid/types/orders.ts
   export type Order = {}
```

**Rationale**: JavaScript/TypeScript convention uses camelCase for functions and variables. File names should match their primary export.

## Naming Reference Table

| File Type | File Naming | Export Naming | Example |
|-----------|-------------|---------------|---------|
| Route files | kebab-case | PascalCase | `deposit-hl-bridge.tsx` → `DepositHLBridge` |
| React Component | PascalCase | PascalCase | `WalletInfo.tsx` → `WalletInfo` |
| Hook | camelCase | camelCase | `useOrderBook.ts` → `useOrderBook` |
| Utility | camelCase | camelCase | `marketUtils.ts` → `formatPrice` |
| Type/Interface | camelCase | PascalCase | `orders.ts` → `Order` |
| Constant | camelCase | UPPER_SNAKE_CASE | `constants.ts` → `MAX_LEVERAGE` |

## Code Naming Conventions

```typescript
// ✅ Component
export const WalletSelector = () => {}

// ✅ Hook
export const useHyperliquidClient = () => {}

// ✅ Function
export const formatPrice = (price: number) => {}

// ✅ Variable
const orderBook = useOrderBook()

// ✅ Constant
export const MAX_ORDER_SIZE = 1000
export const API_BASE_URL = "https://api.example.com"

// ✅ Type/Interface
export type Order = {}
export interface UserData {}

// ✅ Enum
export enum OrderType {
  Market = "market",
  Limit = "limit",
}
```

## Why This Strategy?

This naming strategy is widely adopted in most JavaScript projects for several reasons:

1. **Consistency**: File names match their primary exports, reducing cognitive load
2. **Predictability**: You can tell what a file exports just by looking at its name
3. **Natural Classification**: Files with PascalCase are immediately recognizable as Components
4. **Follows Conventions**:
   - React Components must use PascalCase
   - Hooks must start with `use` and use camelCase
   - URL convention uses kebab-case
5. **Practical**: This is the most common practice in real React projects. It's rare to see codebases using a single naming style exclusively.

## Migrating Existing Files

When renaming existing files to comply with this convention, remember to update all import statements. It's recommended to use your IDE's refactoring feature (Rename Symbol) to safely perform the rename operation.
