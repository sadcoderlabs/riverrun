# Unified Subscription System - Design Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Design Decisions](#design-decisions)
4. [Core Concepts](#core-concepts)
5. [Usage Guide](#usage-guide)
6. [Extension Guide](#extension-guide)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What is this system?

A **unified subscription system** that manages WebSocket subscriptions and HTTP data fetching for the Hyperliquid trading platform, with built-in support for:

- **Reference Counting (RefCount)**: Automatic sharing of subscriptions across components
- **App Lifecycle Management**: Pause/resume subscriptions when app goes to background/foreground
- **Global Rate Limiting**: Protect the Hyperliquid server from rapid concurrent HTTP requests
- **HTTP + WebSocket Hybrid**: Fast initial data via HTTP, real-time updates via WebSocket

### Why was it built?

**Before**: Each feature (allMids, orderBook, userFills, etc.) had its own custom hook with duplicated logic:
- Manual RefCount management (Zustand stores)
- Manual App Lifecycle handling (multiple `useAppLifecycle()` listeners)
- Manual HTTP rate limiting (per-subscription variables)
- 340 lines for activeAssetData alone

**After**: All features share a unified system:
- Automatic RefCount management
- Single App Lifecycle listener (in `_layout.tsx`)
- Global HTTP rate limiting
- ~30 lines per new subscription

**Code Reduction**:
- activeAssetData: 340 lines → 50 lines (-85%)
- Total system overhead: ~700 lines for unlimited subscriptions

---

## Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  (React Components using useSubscription hook)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Hook Layer                              │
│  • useSubscription (unified API)                            │
│  • useUserFills.v2, useWebData2.v2 (specialized hooks)      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Subscription Manager                        │
│  • subscribe() / unsubscribe()                              │
│  • pauseAll() / resumeAll()                                 │
│  • RefCount management                                       │
│  • Global Rate Limiting                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 Subscription Registry                        │
│  • Subscription configurations                              │
│  • HTTP fetch functions                                      │
│  • WebSocket subscribe functions                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Hyperliquid API                            │
│  • InfoClient (HTTP)                                         │
│  • SubscriptionClient (WebSocket)                           │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
lib/hyperliquid/subscription/
├── core/
│   ├── types.ts                    # Type definitions
│   ├── SubscriptionRegistry.ts     # Registry singleton
│   └── SubscriptionManager.ts      # Manager singleton (RefCount + Lifecycle + Rate Limiting)
├── hooks/
│   └── useSubscription.ts          # Unified React hook API
├── registry/
│   └── hyperliquidSubscriptions.ts # All subscription configurations
├── index.ts                        # Public exports
└── DESIGN.md                       # This file
```

---

## Design Decisions

### 1. Centralized vs. Distributed Management

**Decision**: Centralized management via singletons

**Rationale**:
- Global state (RefCount, rate limiting) needs to be shared across ALL components
- Prevents duplicate subscriptions
- Simplifies App Lifecycle management (single listener instead of N)

**Alternative Considered**: React Context
- Rejected: Would require wrapping entire app, more complex setup
- RefCount and rate limiting are not React-specific concerns

### 2. Global HTTP Rate Limiting

**Decision**: All HTTP requests share a 500ms minimum interval

**Original Design** (Phase 1):
```typescript
subscriptionRegistry.register('allMids', {
  rateLimitMs: 1000  // ❌ Per-subscription rate limiting
});
```

**Improved Design** (Phase 2):
```typescript
// In SubscriptionManager.ts
private lastGlobalHttpFetch = 0;
private readonly GLOBAL_HTTP_MIN_INTERVAL = 500;
```

**Rationale** (from user feedback):
- All HTTP requests go to the same Hyperliquid server via `infoClient`
- Per-subscription rate limiting doesn't protect against concurrent requests from different subscriptions
- Global rate limiting is simpler and more effective

**Example**:
```typescript
// Component A: useSubscription('allMids')        → HTTP fetch at t=0ms
// Component B: useSubscription('userFills')      → HTTP fetch skipped (1ms < 500ms)
// Component C: useSubscription('activeAssetData') → HTTP fetch skipped (2ms < 500ms)
// Result: Only 1 HTTP request to server
```

### 3. App Lifecycle Management

**Decision**: Single global listener in `_layout.tsx`, no per-hook listeners

**Original Design** (Phase 2 bug):
```typescript
// In useSubscription.ts
const appState = useAppLifecycle();  // ❌ Creates N listeners

useEffect(() => {
  if (appState !== 'active') return;
  // subscribe...
}, [appState]);
```

**Problem**: 6 components = 6 `useAppLifecycle()` listeners

**Fixed Design** (Phase 2.5):
```typescript
// In _layout.tsx (ONLY location)
const appState = useAppLifecycle();

useEffect(() => {
  if (appState === 'active') {
    subscriptionManager.resumeAll();
  } else if (appState === 'paused') {
    subscriptionManager.pauseAll();
  }
}, [appState]);
```

```typescript
// In useSubscription.ts
// ✅ No appState dependency
useEffect(() => {
  // Direct subscription, lifecycle managed globally
}, [type, params]);
```

**Rationale**:
- Single source of truth for App Lifecycle
- `pauseAll()`/`resumeAll()` preserves RefCount and state
- Prevents duplicate event listeners

### 4. iOS Face ID Resume Debouncing

**Decision**: 200ms debounce on resume, immediate pause

**Problem Discovered** (Phase 2.5 validation):
iOS lock screen sends: `inactive → active (Face ID) → inactive → background`
```
⏸️ Pausing all subscriptions
▶️ Resuming all subscriptions  ⚠️ Unwanted!
⏸️ Pausing all subscriptions
```

**Solution**: Debounce resume by 200ms
```typescript
// In useAppLifecycle.ts
// Going to background: Immediate pause (save battery ASAP)
if (nextAppState.match(/inactive|background/)) {
  if (resumeDebounceRef.current) {
    clearTimeout(resumeDebounceRef.current);  // Cancel pending resume
  }
  setAppState('paused');  // ✅ Immediate
}

// Coming to foreground: Debounced resume
if (nextAppState === 'active') {
  resumeDebounceRef.current = setTimeout(() => {
    setAppState('active');  // ✅ Only if stable for 200ms
  }, 200);
}
```

**Rationale**:
- Face ID unlock creates brief `active` state (<200ms)
- True unlock keeps app `active` for >200ms
- 200ms is fast enough to be unnoticeable to users

### 5. Data Transformation Location

**Decision**: Keep Registry simple, put complex logic in specialized hooks

**Registry** (simple):
```typescript
register('webData2', {
  key: (params) => params.user,
  httpFetch: async (params) => {
    return await infoClient.userState({ user: params.user });
  },
  subscribe: async (params, callback) => {
    return await subscriptionClient.webData2({ user: params.user }, callback);
  },
});
```

**Specialized Hook** (complex):
```typescript
export function useWebData2() {
  const { data: rawData } = useSubscription('webData2', { user });

  // All calculation logic here
  const totalAccountValue = useMemo(() => {
    // Complex calculations...
  }, [rawData]);

  return { totalAccountValue, ... };
}
```

**Rationale**:
- Registry is declarative and easy to read
- Hooks can customize transformation logic
- Better separation of concerns

### 6. Backward Compatibility Strategy

**Decision**: Create `.v2` files, keep old files temporarily

**Example**:
```
useActiveAssetData.ts       # Old implementation (340 lines)
useActiveAssetData.v2.ts    # New implementation (50 lines)
```

**Rationale**:
- Zero breaking changes
- Can migrate gradually
- Easy to compare and validate
- Can rollback if issues found

**Cleanup Plan** (Phase 3.1+):
- Once `.v2` is validated in production → delete old files

---

## Core Concepts

### 1. Reference Counting (RefCount)

**Purpose**: Share subscriptions across multiple components

**How it works**:
```typescript
// Component A mounts
useSubscription('allMids')  // refCount: 0 → 1, create subscription

// Component B mounts
useSubscription('allMids')  // refCount: 1 → 2, reuse subscription

// Component A unmounts
// refCount: 2 → 1, keep subscription alive

// Component B unmounts
// refCount: 1 → 0, cleanup subscription
```

**Store Key Format**: `${type}:${key}`
- Example: `allMids:global`, `orderBook:BTC-2`, `userFills:0x123...`

**Benefits**:
- Saves WebSocket connections
- Saves HTTP requests
- Reduces server load

### 2. App Lifecycle States

```
┌─────────┐  App to foreground   ┌────────┐
│  active │ ◄─────────────────── │ paused │
└─────────┘                       └────────┘
     │                                ▲
     │ App to background              │
     └────────────────────────────────┘

     paused ──(30s)──> suspended
```

**States**:
- **active**: App in foreground, subscriptions active
- **paused**: App in background, subscriptions paused (WebSocket closed, state preserved)
- **suspended**: App in background >30s, subscriptions suspended

**Actions**:
- `pauseAll()`: Unsubscribe WebSocket, keep state and refCount
- `resumeAll()`: Resubscribe WebSocket using stored params

### 3. Subscription Key Generation

**Purpose**: Generate unique identifier for each subscription

**Examples**:
```typescript
// allMids: Global singleton
key: () => 'global'
// Store key: "allMids:global"

// orderBook: Per coin + precision
key: (params) => `${params.coin}-${params.nSigFigs ?? 'full'}`
// Store key: "orderBook:BTC-2", "orderBook:ETH-full"

// userFills: Per user
key: (params) => params.user
// Store key: "userFills:0x818C4fBd8Eb992f9506a899E61B2c49EE9514D85"

// activeAssetData: Per user + coin
key: (params) => `${params.user}-${params.coin}`
// Store key: "activeAssetData:0x818C4fBd8Eb992f9506a899E61B2c49EE9514D85-ETH"
```

**Key Design Principle**:
- Same params → Same key → Share subscription
- Different params → Different key → Separate subscription

---

## Usage Guide

### For Application Developers

#### Basic Usage (Direct useSubscription)

```typescript
import { useSubscription } from '@/lib/hyperliquid/subscription';

function MyComponent() {
  // Simple subscription (no params)
  const { data: allMids, isLoading, error } = useSubscription('allMids');

  // With params
  const { data: orderBook } = useSubscription('orderBook', {
    coin: 'BTC',
    nSigFigs: 2,
  });

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <p>BTC Price: {allMids.mids.BTC}</p>}
    </div>
  );
}
```

#### Advanced Usage (Specialized Hooks)

```typescript
import { useUserFills } from '@/lib/hyperliquid/hooks/useUserFills.v2';

function UserFillsComponent() {
  const { fills, isLoading, error } = useUserFills();

  // fills is already transformed and deduplicated
  return (
    <div>
      {fills.map(fill => (
        <div key={fill.tid}>{fill.coin}: {fill.px}</div>
      ))}
    </div>
  );
}
```

### For System Maintainers

#### Adding a New Subscription

**Step 1**: Register in `hyperliquidSubscriptions.ts`
```typescript
subscriptionRegistry.register('myNewSubscription', {
  // Generate unique key for this subscription
  key: (params: { userId: string }) => params.userId,

  // HTTP fetch (optional, for initial fast data)
  httpFetch: async (params) => {
    const data = await infoClient.someEndpoint({ user: params.userId });
    return data;
  },

  // WebSocket subscribe (required for real-time updates)
  subscribe: async (params, callback) => {
    const subscription = await subscriptionClient.someEvent(
      { user: params.userId },
      (data) => {
        // Optional: filter or transform data
        callback(data);
      }
    );
    return subscription;
  },
});
```

**Step 2** (Optional): Create specialized hook
```typescript
// lib/hyperliquid/hooks/useMyFeature.ts
export function useMyFeature() {
  const wallet = useActiveWallet();
  const { data, isLoading, error } = useSubscription('myNewSubscription', {
    userId: wallet?.address,
  });

  // Optional: Transform data
  const transformedData = useMemo(() => {
    if (!data) return undefined;
    return {
      // Custom transformations
    };
  }, [data]);

  return { transformedData, isLoading, error };
}
```

**Step 3**: Use in components
```typescript
import { useMyFeature } from '@/lib/hyperliquid/hooks/useMyFeature';

function MyComponent() {
  const { transformedData } = useMyFeature();
  // ...
}
```

---

## Extension Guide

### Adding Support for New Data Sources

Currently supports Hyperliquid. To add new sources (e.g., another exchange):

1. Create new registry file:
```typescript
// lib/exchange2/subscription/registry/exchange2Subscriptions.ts
import { subscriptionRegistry } from '@/lib/hyperliquid/subscription';

subscriptionRegistry.register('exchange2_ticker', {
  key: (params) => params.symbol,
  httpFetch: async (params) => {
    // Fetch from Exchange2 REST API
  },
  subscribe: async (params, callback) => {
    // Subscribe to Exchange2 WebSocket
  },
});
```

2. Use the same `useSubscription` hook:
```typescript
const { data } = useSubscription('exchange2_ticker', { symbol: 'BTC-USD' });
```

**The system is data-source agnostic!**

### Adding Custom Rate Limiting Per Subscription

If you need per-subscription rate limiting in addition to global:

```typescript
// In subscription config
let lastFetchTime = 0;

subscriptionRegistry.register('rateLimitedSub', {
  httpFetch: async (params) => {
    const now = Date.now();
    if (now - lastFetchTime < 2000) {
      console.log('Skipping per-subscription rate limit');
      return undefined; // Skip HTTP, rely on WebSocket
    }
    lastFetchTime = now;
    return await infoClient.someEndpoint();
  },
  // ...
});
```

---

## Performance Considerations

### Memory Usage

**RefCount prevents memory leaks**:
- Subscriptions are only kept alive while components use them
- Cleanup happens automatically when refCount reaches 0

**Store Size**:
- Map of active subscriptions (typically 5-20 entries)
- Each entry: ~1KB (subscription object + data)
- Total: ~5-20KB

### Network Usage

**HTTP**:
- Global 500ms rate limit prevents request bursts
- Only fetches when data is stale

**WebSocket**:
- Shared connections via RefCount
- Automatically paused in background (saves data and battery)

**Example Scenario** (6 components using allMids):
- Without RefCount: 6 WebSocket connections
- With RefCount: 1 WebSocket connection ✅

### CPU Usage

**Minimal overhead**:
- Subscription lookup: O(1) Map access
- RefCount update: Simple integer increment/decrement
- No complex computations in core system

---

## Troubleshooting

### Issue: Data not updating

**Check**:
1. Is app in foreground? (Subscriptions pause in background)
2. Are there console errors?
3. Is WebSocket connected? (Check browser DevTools Network tab)

**Debug**:
```typescript
// Check subscription state
import { subscriptionManager } from '@/lib/hyperliquid/subscription';

const state = subscriptionManager.getSubscriptionState('allMids', 'global');
console.log('Subscription state:', state);
// Check: refCount, isPaused, data, isLoading
```

### Issue: Duplicate subscriptions

**Symptom**: Multiple WebSocket connections for same data

**Likely Cause**: Different keys for same conceptual subscription

**Solution**: Ensure consistent key generation
```typescript
// ❌ Bad: Different keys for same user
key: (params) => Math.random()  // New key every time!

// ✅ Good: Stable key
key: (params) => params.user
```

### Issue: Memory leak

**Symptom**: Subscriptions not cleaning up

**Debug**:
```typescript
// Check all active subscriptions
const allSubs = subscriptionManager.getAllSubscriptions();
console.log('Active subscriptions:', allSubs.size);
Array.from(allSubs.entries()).forEach(([key, entry]) => {
  console.log(`${key}: refCount=${entry.refCount}`);
});
```

**Common Causes**:
1. Component not unmounting properly
2. Missing cleanup in useEffect
3. RefCount increment without corresponding decrement (bug in SubscriptionManager)

### Issue: Rate limiting too aggressive

**Symptom**: HTTP fetch always skipped

**Solution**: Adjust `GLOBAL_HTTP_MIN_INTERVAL` in `SubscriptionManager.ts`:
```typescript
private readonly GLOBAL_HTTP_MIN_INTERVAL = 500;  // Increase if needed
```

### Issue: iOS Face ID still causing resume

**Symptom**: Subscriptions resume during lock screen

**Check**: Debounce timing in `useAppLifecycle.ts`
```typescript
resumeDebounceRef.current = setTimeout(() => {
  setAppState('active');
}, 200);  // Try increasing to 300-500ms
```

---

## Change Log

### Phase 1 (Initial Implementation)
- ✅ Core system: SubscriptionManager + SubscriptionRegistry
- ✅ useSubscription hook
- ✅ 2 sample subscriptions: allMids, orderBook

### Phase 2 (Migration)
- ✅ Migrated 3 subscriptions: userFills, webData2, activeAssetData
- ✅ Created .v2 hooks
- ✅ Global HTTP rate limiting (user feedback)
- ✅ Code reduction: activeAssetData 340 → 50 lines (-85%)

### Phase 2.5 (iOS Face ID Fix)
- ✅ Removed duplicate useAppLifecycle listeners (7 → 1)
- ✅ Added 200ms resume debounce
- ✅ Fixed unwanted resume during lock screen

### Phase 3.1 (Cleanup) - Current
- 🔄 Delete old useAllMids.ts and useOrderBook.ts
- 🔄 Update OrderBook.tsx to use new system
- 🔄 Update exports

---

## References

**Related Documentation**:
- `SUBSCRIPTION_SYSTEM.md` - User-facing documentation
- `PHASE_2_HANDOVER.md` - Implementation details and handover notes

**Code Locations**:
- Core: `lib/hyperliquid/subscription/core/`
- Hooks: `lib/hyperliquid/subscription/hooks/`
- Registry: `lib/hyperliquid/subscription/registry/`
- App Lifecycle: `lib/hyperliquid/hooks/useAppLifecycle.ts`
- Integration: `app/_layout.tsx`

**Key Files**:
- `SubscriptionManager.ts`: RefCount + Lifecycle + Rate Limiting
- `SubscriptionRegistry.ts`: Subscription configs
- `useSubscription.ts`: React hook API
- `hyperliquidSubscriptions.ts`: All registered subscriptions

---

## Contributing

When adding new subscriptions or modifying the system:

1. **Test thoroughly**:
   - Multiple components using same subscription (RefCount)
   - App lifecycle (lock/unlock phone)
   - Network errors
   - Cleanup on unmount

2. **Document**:
   - Update this file if changing core behavior
   - Add comments explaining non-obvious logic
   - Update SUBSCRIPTION_SYSTEM.md for user-facing changes

3. **Follow patterns**:
   - Keep Registry simple (declarative)
   - Put complex logic in specialized hooks
   - Use stable key generation
   - Handle errors gracefully

4. **Performance**:
   - Avoid unnecessary re-renders
   - Use `useMemo` for expensive computations
   - Keep subscription data minimal

---

**Last Updated**: Phase 3.1
**Maintainer**: See git blame for recent changes
