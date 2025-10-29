# Coding Style Guide

## TypeScript Type Conventions

### Prefer `undefined` over `null`

This project uses `undefined` instead of `null` as a deliberate coding style choice for representing absence of values.

**Rationale:**
- Consistency with TypeScript's optional parameter behavior
- Better alignment with JavaScript's default behavior
- Clearer intent when a value is intentionally absent vs. explicitly set to nothing

**Examples:**

```typescript
// ✅ Preferred
type WalletSource = 'privy' | 'reown' | undefined;
function getWallet(): Wallet | undefined { ... }
let selectedWallet: Wallet | undefined = undefined;

// ❌ Avoid
type WalletSource = 'privy' | 'reown' | null;
function getWallet(): Wallet | null { ... }
let selectedWallet: Wallet | null = null;
```

**When to apply:**
- Return types for functions that may not return a value
- Optional properties and parameters
- Type unions representing "no value" states
- Variable initialization for values that may be absent

**Exceptions:**
- When interfacing with third-party libraries that explicitly use `null`
- When working with JSON that requires `null` for serialization compatibility

This convention should be applied consistently throughout the codebase, including:
- Function return types
- Type definitions and interfaces
- Variable declarations
- Optional properties
- Union types representing absence
