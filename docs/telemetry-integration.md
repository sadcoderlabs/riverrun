# Telemetry Integration Guide

## Overview

The Riverrun app uses a comprehensive telemetry system built on **Sentry** for error tracking, performance monitoring, and user behavior analysis. The system follows clean architecture principles with a hexagonal (ports & adapters) pattern.

**Note**: This implementation uses `@sentry/react-native` directly (Expo SDK 50+). The deprecated `sentry-expo` package is **not** used.

## Architecture

The telemetry system is implemented as a bounded context within the clean architecture:

```
core/contexts/telemetry/
├── ports/                      # Business interfaces (domain layer)
│   ├── telemetryPort.ts       # TelemetryPort interface
│   └── types.ts               # Domain types
├── adapters/                   # External integrations
│   ├── telemetryStore.ts      # Zustand store for state
│   └── sentryAdapter.ts       # Sentry SDK wrapper
├── application/                # Business logic
│   └── telemetryService.ts    # Core service implementing TelemetryPort
├── reactNative/                # React integration
│   ├── telemetryComposition.tsx  # DI composition provider
│   ├── useTelemetry.ts          # Business operations hook
│   └── useTelemetryStore.ts     # State access hook
└── utils/
    └── breadcrumbs.ts          # Breadcrumb helper utilities

core/infra/sentry/
└── sentryConfig.ts             # Sentry SDK initialization
```

## Dependencies

The project uses:

- `@sentry/react-native` v7.2.0+ - Core Sentry SDK for React Native
- Expo SDK 54 with `@sentry/react-native/expo` plugin

**Note**: `sentry-expo` is deprecated since Expo SDK 50 and is **not** used in this project.

## Configuration

### Step 1: Obtain Sentry DSN

1. Create a project at https://sentry.io
2. Navigate to **Settings** → **Projects** → **[Your Project]** → **Client Keys (DSN)**
3. Copy your DSN (format: `https://[key]@[organization].ingest.sentry.io/[project]`)

### Step 2: Configure DSN in Environment

**Option A: Using `app.json`** (Recommended for Expo projects)

Edit your `app.json`:

```json
{
  "expo": {
    "name": "Riverrun",
    "extra": {
      "sentryDsn": "https://your-sentry-dsn-here@o123456.ingest.sentry.io/123456"
    }
  }
}
```

**Option B: Using Environment Variables**

Create or update `.env`:

```env
EXPO_PUBLIC_SENTRY_DSN=https://your-sentry-dsn-here@o123456.ingest.sentry.io/123456
```

### Step 3: Verify Configuration

Run the app in development mode. You should see:

```
[Sentry] Initialized in development environment
```

To test error tracking, trigger a test error:

```typescript
import { useTelemetry } from '@/core/composition';

const { captureError } = useTelemetry();
captureError(new Error('Test error from mobile app'));
```

Check your Sentry dashboard to verify the error appears.

## Usage Examples

### Basic Error Tracking

```typescript
import { useTelemetry } from '@/core/composition';

function MyComponent() {
  const { captureError, addBreadcrumb } = useTelemetry();

  const handleSubmit = async () => {
    // Add breadcrumb for context
    addBreadcrumb({
      category: 'user',
      message: 'User clicked submit button',
      level: 'info',
    });

    try {
      await submitForm();
    } catch (error) {
      // Capture error with additional context
      captureError(error, {
        component: 'MyComponent',
        action: 'submit_form',
        tags: { formType: 'registration' },
      });
    }
  };

  return <Button onPress={handleSubmit}>Submit</Button>;
}
```

### Using Breadcrumb Helpers

The system provides helper functions for common breadcrumb types:

```typescript
import {
  useTelemetry,
  createUserActionBreadcrumb,
  createTransactionBreadcrumb,
  createNavigationBreadcrumb,
  createNetworkBreadcrumb,
} from '@/core/composition';

const { addBreadcrumb } = useTelemetry();

// User actions
addBreadcrumb(createUserActionBreadcrumb('place_order', { coin: 'BTC', size: 1.5 }));

// Blockchain transactions
addBreadcrumb(createTransactionBreadcrumb('swap', { from: 'USDC', to: 'BTC' }));

// Navigation events
addBreadcrumb(createNavigationBreadcrumb('TradeScreen', { coin: 'BTC' }));

// Network requests
addBreadcrumb(createNetworkBreadcrumb('POST', '/api/orders', 200));
```

### Performance Monitoring

```typescript
import { useTelemetry } from '@/core/composition';

const { startTransaction } = useTelemetry();

async function loadMarketData() {
  const transaction = startTransaction({
    name: 'Load Market Data',
    operation: 'http',
    tags: { endpoint: '/market-data' },
  });

  try {
    const data = await fetchMarketData();
    transaction?.finish();
    return data;
  } catch (error) {
    transaction?.fail(error);
    throw error;
  }
}
```

**Note**: The implementation uses Sentry SDK 7.x modern APIs (`startSpanManual` and `startInactiveSpan`) for manual performance tracking. Automatic instrumentation (`enableAutoPerformanceTracing: true`) is also enabled for tracking React Native operations automatically.

### Capturing Messages

```typescript
import { useTelemetry } from '@/core/composition';

const { captureMessage } = useTelemetry();

// Log important events
captureMessage('User completed onboarding', 'info');

// Log warnings
captureMessage('API rate limit approaching', 'warning', {
  component: 'ApiClient',
  data: { remainingRequests: 10 },
});
```

### State Access

For accessing telemetry state (e.g., checking if enabled):

```typescript
import { useTelemetryStore } from '@/core/composition';

function TelemetrySettings() {
  const userId = useTelemetryStore(state => state.userId);
  const isEnabled = useTelemetryStore(state => state.isEnabled);

  return (
    <View>
      <Text>User ID: {userId || 'Not identified'}</Text>
      <Text>Status: {isEnabled ? 'Enabled' : 'Disabled'}</Text>
    </View>
  );
}
```

## Features

### Automatic Features

The system automatically provides:

✅ **Error Tracking** - Captures unhandled exceptions and errors
✅ **Performance Monitoring** - Tracks app performance and slow operations (20% sample rate in production)
✅ **Session Tracking** - Records user sessions every 30 seconds
✅ **Native Crash Reporting** - Captures native iOS/Android crashes
✅ **User Identification** - Automatically identifies users by wallet address when connected
✅ **Privacy Protection** - Filters sensitive data (private keys, mnemonics, passwords)
✅ **Environment Detection** - Distinguishes between development, staging, and production

### Privacy & Security

The system automatically filters sensitive data:

- Private keys (`privateKey`)
- Mnemonics (`mnemonic`, `seed`)
- Passwords (`password`)
- Secrets (`secret`)

This is configured in `core/infra/sentry/sentryConfig.ts` via the `beforeSend` hook.

### User Identification

Users are automatically identified by their wallet address when they connect:

```typescript
// This happens automatically in TelemetryService
// When wallet connects → identifies user
// When wallet disconnects → clears user
```

The service subscribes to `activeWalletStore` and handles identification automatically.

## Environment-Specific Behavior

| Environment | Sample Rate | Debug Logs | Console Breadcrumbs |
| ----------- | ----------- | ---------- | ------------------- |
| Development | 100%        | ✅ Yes     | ✅ Yes              |
| Staging     | 100%        | ❌ No      | ✅ Yes              |
| Production  | 20%         | ❌ No      | ❌ No               |

## Current Limitations & Future Improvements

### Known Limitations

1. **Manual Transaction API**: Sentry SDK 7.x has simplified the transaction API. The current implementation provides a lightweight handle for compatibility, but relies on automatic instrumentation for actual tracking.

2. **Navigation Integration**: React Navigation integration requires manual breadcrumb tracking. Automatic screen tracking is not yet implemented.

### Future Improvements

#### Phase 2: Segment Integration

The architecture is designed to support multiple telemetry backends. To add Segment:

1. Create `core/contexts/telemetry/adapters/segmentAdapter.ts`
2. Extend `TelemetryPort` with analytics methods:
   ```typescript
   interface TelemetryPort {
     // ... existing methods
     track(event: string, properties?: Record<string, unknown>): Promise<void>;
     screen(name: string, properties?: Record<string, unknown>): Promise<void>;
   }
   ```
3. Update `TelemetryService` to coordinate both Sentry and Segment
4. No changes required to consumers

#### Performance Tracking Enhancements

The current implementation uses Sentry SDK 7.x modern APIs (`startSpanManual` and `startInactiveSpan`). Future enhancements could include:

- More granular span tracking for specific operations
- Custom instrumentation for React Navigation
- Advanced profiling integration when available in React Native SDK

#### Navigation Tracking

To implement automatic navigation tracking:

1. Add navigation breadcrumbs in `app/_layout.tsx`:

   ```typescript
   import { useTelemetry, createNavigationBreadcrumb } from '@/core/composition';

   const { addBreadcrumb } = useTelemetry();

   <Stack
     screenListeners={{
       state: (e) => {
         const route = getCurrentRoute(e.data.state);
         addBreadcrumb(createNavigationBreadcrumb(route.name, route.params));
       },
     }}
   />
   ```

## Working with AI Agents

When collaborating with AI agents on telemetry-related tasks:

### Adding New Telemetry Points

1. **For Errors**: Use `captureError()` with appropriate context

   ```typescript
   captureError(error, {
     component: 'ComponentName',
     action: 'action_name',
     tags: {
       /* relevant tags */
     },
   });
   ```

2. **For User Actions**: Add breadcrumbs using helpers

   ```typescript
   addBreadcrumb(createUserActionBreadcrumb('action_name', data));
   ```

3. **For Transactions**: Add breadcrumbs for important operations
   ```typescript
   addBreadcrumb(createTransactionBreadcrumb('transaction_type', data));
   ```

### Modifying the Telemetry System

- **Ports Layer** (`ports/`): Define new business interfaces or types
- **Adapters Layer** (`adapters/`): Add new external SDK integrations
- **Application Layer** (`application/`): Implement business logic
- **React Layer** (`reactNative/`): Create hooks for UI integration

### Testing Telemetry

To test telemetry in development:

```typescript
// Test error tracking
captureError(new Error('Test error'));

// Test breadcrumbs
addBreadcrumb({ category: 'test', message: 'Test breadcrumb', level: 'info' });

// Test user identification (automatic on wallet connect)
// Just connect a wallet and check Sentry dashboard
```

## Troubleshooting

### Sentry not receiving events

1. Check that DSN is configured correctly in `app.json` or `.env`
2. Verify console shows: `[Sentry] Initialized in [environment] environment`
3. Ensure `@sentry/react-native/expo` plugin is listed in `app.json` plugins array:
   ```json
   {
     "expo": {
       "plugins": ["@sentry/react-native/expo"]
     }
   }
   ```
4. Check Sentry dashboard for project configuration
5. Ensure you're not in an ignored error pattern (see `ignoreErrors` in `sentryConfig.ts`)
6. After modifying `app.json`, run prebuild: `npx expo prebuild --clean`

### TypeScript errors

If you see TypeScript errors related to Sentry SDK:

1. Check the installed version: `pnpm list @sentry/react-native`
2. Ensure compatibility with the adapter implementation
3. Refer to Sentry React Native docs: https://docs.sentry.io/platforms/react-native/

### Performance issues

If telemetry is affecting app performance:

1. Reduce sample rate in production (currently 20%)
2. Limit breadcrumbs (currently 100)
3. Disable unnecessary features in `sentryConfig.ts`

## Migration from sentry-expo

**⚠️ Important**: `sentry-expo` is deprecated since Expo SDK 50 (Jan 18, 2024). This project uses `@sentry/react-native` directly.

If you encounter any legacy references to `sentry-expo`:

1. **Remove the package**: `pnpm remove sentry-expo`
2. **Update app.json**: Replace `"sentry-expo"` with `"@sentry/react-native/expo"` in the plugins array
3. **Keep using**: `@sentry/react-native` imports (no code changes needed)

Our implementation already follows the modern approach and does not use `sentry-expo`.

## Additional Resources

- **Sentry React Native Documentation**: https://docs.sentry.io/platforms/react-native/
- **Sentry + Expo Guide**: https://docs.sentry.io/platforms/react-native/manual-setup/expo/
- **Migration Guide**: https://docs.expo.dev/guides/using-sentry/#migration-from-sentry-expo
- **Clean Architecture**: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- **Hexagonal Architecture**: https://alistair.cockburn.us/hexagonal-architecture/

## Contact

For questions or issues with telemetry integration, please:

1. Check this documentation first
2. Review the Sentry dashboard for error details
3. Consult the team lead for DSN access or configuration changes
