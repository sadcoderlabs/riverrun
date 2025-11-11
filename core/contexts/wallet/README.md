# Wallet Context - Hexagonal Architecture

This directory contains the wallet management system built with **Hexagonal Architecture** (Ports & Adapters pattern).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Layer (React)                        │
│              useWallet() / useWalletConnection()             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Composition Root (DI Container)                 │
│              WalletCompositionProvider                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Application Layer                               │
│              WalletService (Business Logic)                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
           ┌───────┴────────┐
           │                │
┌──────────▼──────┐  ┌──────▼──────────┐
│  PrivyAdapter   │  │  ReownAdapter   │  ◄─── Adapters
└──────────┬──────┘  └──────┬──────────┘
           │                │
┌──────────▼──────┐  ┌──────▼──────────┐
│   Privy SDK     │  │   Reown SDK     │  ◄─── External
└─────────────────┘  └─────────────────┘
```

## Directory Structure

```
core/contexts/wallet/
├── ports/                    # Interfaces (domain boundaries)
│   ├── walletPort.ts        # Core wallet interface
│   └── types.ts             # Shared types
├── adapters/                 # External integrations
│   ├── privyWalletAdapter.ts    # Privy SDK wrapper
│   ├── reownWalletAdapter.ts    # Reown SDK wrapper
│   └── index.ts
├── application/              # Business logic
│   ├── walletService.ts         # Core service implementation
│   ├── walletSelectionStore.ts  # State management
│   └── index.ts
├── index.ts                  # Public API (types only)
└── README.md                 # This file

core/composition/
└── walletComposition.tsx     # DI container (React entry point)
```

## Design Principles

### 1. Dependency Inversion

The core business logic (WalletService) depends on **abstractions** (WalletPort interface), not on concrete implementations (SDK adapters).

```
Application Layer → Ports (interfaces) ← Adapters
```

### 2. Separation of Concerns

- **Ports**: Define what the wallet system can do (interfaces)
- **Adapters**: Implement how to integrate with external SDKs
- **Application**: Implement business logic (wallet selection, fallback)
- **Composition**: Wire everything together with DI

### 3. Testability

- Business logic can be tested without React or external SDKs
- Adapters can be mocked for unit tests
- Pure functions wherever possible

### 4. Flexibility

- Easy to add new wallet providers (just implement WalletPort)
- Easy to swap implementations
- SDK upgrades isolated to adapter layer

## Usage

### Setup (in app/_layout.tsx)

```tsx
import { WalletCompositionProvider } from '@/core/composition';

<PrivyProvider>
  <AppKit>
    <WalletCompositionProvider>
      <YourApp />
    </WalletCompositionProvider>
  </AppKit>
</PrivyProvider>
```

### Using in Components

**Two Ways to Access Wallet State:**

**Important:** `WalletCompositionProvider` handles initialization automatically. It only renders children when the wallet system is ready, so you never need to check `isReady` in your components!

#### Option 1: Convenience Hook (Recommended for most cases)

Use `useActiveWallet()` for automatic reactive updates:

```tsx
import { useActiveWallet } from '@/core/composition';

function MyComponent() {
  const { wallet } = useActiveWallet();

  if (!wallet) {
    return <Text>Not connected</Text>;
  }

  return (
    <View>
      <Text>Connected: {wallet.address}</Text>
      <Text>Name: {wallet.name}</Text>
    </View>
  );
}
```

#### Option 2: Direct Service Access (For full control)

Use `useWalletComposition()` when you need direct access to wallet operations:

```tsx
import { useWalletComposition } from '@/core/composition';

function WalletConnector() {
  const { walletService } = useWalletComposition();

  return (
    <View>
      <Button onPress={() => walletService.connect('privy')}>
        Connect with Email
      </Button>
      <Button onPress={() => walletService.connect('reown')}>
        Connect External Wallet
      </Button>
    </View>
  );
}
```

#### Combining Both

For components that need both display and operations:

```tsx
import { useActiveWallet, useWalletComposition } from '@/core/composition';

function WalletPanel() {
  const { wallet } = useActiveWallet();
  const { walletService } = useWalletComposition();

  if (!wallet) {
    return (
      <View>
        <Button onPress={() => walletService.connect('privy')}>
          Connect Email
        </Button>
        <Button onPress={() => walletService.connect('reown')}>
          Connect Wallet
        </Button>
      </View>
    );
  }

  return (
    <View>
      <Text>Connected: {wallet.address}</Text>
      <Button onPress={() => walletService.disconnect(wallet.source)}>
        Disconnect
      </Button>
    </View>
  );
}
```

### Common Operations

```tsx
import { useWalletComposition } from '@/core/composition';

function WalletOperations() {
  const { walletService } = useWalletComposition();

  // Get active wallet
  const wallet = await walletService.active();

  // List all available wallets
  const wallets = await walletService.listAvailable();

  // Connect wallet
  await walletService.connect('privy');   // Email login
  await walletService.connect('reown');   // External wallet

  // Disconnect wallet
  await walletService.disconnect('privy');
  await walletService.disconnect('reown');

  // Switch active wallet
  await walletService.setActive('reown');

  // Sign message
  const signature = await walletService.signMessage({
    message: 'Hello World',
  });

  // Sign and send transaction
  const result = await walletService.signAndSendTx({
    to: '0x...',
    value: '0x0',
  });

  // Get signer (for SDK integration)
  const signer = await walletService.getSigner();
}
```

## Key Interfaces

### WalletPort

The main interface that defines wallet operations:

```typescript
interface WalletPort {
  listAvailable(): Promise<WalletInfo[]>;
  active(): Promise<ActiveWallet | undefined>;
  connect(source: WalletSource): Promise<void>;
  disconnect(source: WalletSource): Promise<void>;
  setActive(source: WalletSource): Promise<void>;
  signMessage(input: SignMessageInput): Promise<`0x${string}`>;
  signAndSendTx(input: SignTxInput): Promise<TxResult>;
  getSigner(): Promise<Signer>;
}
```

### ActiveWallet

The active wallet with operations:

```typescript
interface ActiveWallet {
  address: string;
  name: string;
  type: WalletType;
  source: WalletSource;
  getProvider: () => Promise<BrowserProvider>;
  switchChain: (chainId: number) => Promise<void>;
}
```

## Wallet Selection Logic (Business Rules)

All wallet selection logic is implemented in **WalletService** (application layer), not in the UI or composition layer.

### Core Business Rules

1. **User Preference**: If user has explicitly selected a wallet, use that
2. **Default Priority**: Privy > Reown (if no explicit selection)
3. **Availability Check**: Ensure selected wallet is actually connected
4. **Smart Fallback**: Fall back to other wallet if selected one is not available
5. **Auto-switch**: Automatically switch to newly connected Reown wallet

### Why Business Logic in Service?

The auto-switch logic when a new wallet connects is a **business rule**, not infrastructure code:

```typescript
// ✅ GOOD: Business logic in WalletService
class WalletService {
  handleConnectionStateChange(): void {
    const isReownConnected = this.reownAdapter.isAvailable();
    if (!this.previousReownConnected && isReownConnected) {
      this.setSelectedSource('reown'); // Business decision
    }
    this.previousReownConnected = isReownConnected;
  }
}

// ✅ GOOD: Composition layer just triggers it
useEffect(() => {
  walletService.handleConnectionStateChange();
}, [walletService, isConnected]);
```

```typescript
// ❌ BAD: Business logic in composition layer
useEffect(() => {
  if (!prevIsConnected.current && isConnected) {
    setSelectedWalletSource('reown'); // Business logic leaked!
  }
  prevIsConnected.current = isConnected;
}, [isConnected]);
```

This follows the **Single Responsibility Principle**: composition layer only wires dependencies, business logic stays in the service.

## Integration with Hyperliquid

The wallet service exposes `getSigner()` for integration with third-party libraries:

```typescript
// In your Hyperliquid client code
const { walletService } = useWalletComposition();
const signer = await walletService.getSigner();

// Create Hyperliquid client
const client = new ExchangeClient({
  signer,
  // ... other options
});
```

## Migration Strategy

This new architecture **coexists** with the old implementation:

- **Old**: `lib/riverrun/wallet/useActiveWallet.ts`, `useWalletManager.ts`
- **New**: `core/contexts/wallet/` (hexagonal architecture)

Both can be used simultaneously. Gradually migrate components from old to new:

```tsx
// Old way (still works)
import { useActiveWallet, useWalletManager } from '@/lib/riverrun/wallet';

const { wallet } = useActiveWallet();
const { connectPrivy, connectReown } = useWalletManager();

// New way (hexagonal architecture)
import { useWalletComposition } from '@/core/composition';

const { walletService } = useWalletComposition();
const wallet = await walletService.active();
await walletService.connect('privy');
await walletService.connect('reown');
```

### Why Provide useActiveWallet?

We provide a **single convenience hook** `useActiveWallet()` for common use cases:

1. **Reactive Updates**: Automatically re-renders when wallet state changes
2. **Reduced Boilerplate**: Avoids repeating `useEffect` + `useState` in every component
3. **Proper Subscriptions**: Subscribes to all relevant state changes (selectedSource, addresses, connection states)
4. **On-Demand Computation**: Still calls `walletService.active()` - no caching in Zustand
5. **Architecture Compliance**: Lives in composition layer (infrastructure), not wallet context (domain)

**When to use what:**
- `useActiveWallet()` - When you just need to display wallet info (address, name)
- `useWalletComposition()` - When you need to call wallet operations (connect, disconnect, sign)
- Both together - When you need display + operations

**Why not cache in Zustand?**
- Active wallet is derived state (computed from selectedSource + adapter availability)
- Computation is trivial (<0.1ms)
- Wallet changes are infrequent (1-10 times per session)
- On-demand computation ensures data is always fresh
- Avoids cache invalidation complexity

## Benefits

1. **Clear Boundaries**: Business logic separated from framework code
2. **Single Entry Point**: Only `useWalletComposition()` for React access
3. **Direct Service Access**: No unnecessary hook wrappers - access `walletService` directly
4. **Easy Testing**: Mock adapters for unit tests
5. **Type Safety**: Strong TypeScript types throughout
6. **Future-Proof**: Easy to add new wallet providers
7. **SDK Independence**: Upgrade SDKs without changing business logic
8. **Thin UI Layer**: Components stay simple and delegate to business logic
9. **AI-Friendly**: Clear structure helps AI agents understand code boundaries

## Future Work

- Add unit tests for WalletService
- Create mock adapters for testing
- Migrate Hyperliquid context to use hexagonal architecture
- Add more wallet providers (WalletConnect, MetaMask, etc.)

## Related Contexts

- **Agent Wallet**: Located in `lib/riverrun/agent/` (will migrate with Hyperliquid context)
- **Hyperliquid**: Future migration target, will depend on this wallet context

## References

- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Ports & Adapters Pattern](https://herbertograca.com/2017/09/14/ports-adapters-architecture/)
