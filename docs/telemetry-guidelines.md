# Telemetry Guidelines

## Overview

The Riverrun app uses Sentry for error tracking and user behavior analysis. This document outlines the principles for using telemetry—refer to the codebase for implementation details.

## When to Use captureError vs captureWarning

### captureError

Use for **critical failures** that affect core functionality:

- Order placement/cancellation failures
- Position/margin data processing errors
- Deposit/withdrawal failures
- WebSocket subscription failures
- Agent approval/revocation failures

### captureWarning

Use for **non-critical issues** that don't block the user:

- Balance query failures (retryable)
- OTA update check failures
- Customer support (Intercom) failures
- Optional feature failures

## Context Requirements

Always provide context when capturing errors:

```typescript
telemetryService.captureError(error, {
  component: 'ComponentName',    // Where the error occurred
  action: 'actionName',          // What operation failed
  extra: { /* relevant data */ } // Additional context (no PII)
});
```

## Type Safety

All telemetry events are type-safe. Refer to these files for available types:

- `contexts/telemetry/ports/types.ts` - Event names, screen names, error context types
- `app-internal/features/telemetry/hooks/useTelemetry.ts` - Hook interface

Adding new event types requires updating the type definitions first.

## Privacy Protection

The system automatically filters sensitive data:

- Private keys, mnemonics, seeds
- Passwords and secrets

Never include PII (email, phone, full name) in telemetry context.

## Environment Behavior

| Environment | Error Sample Rate | Debug Logs |
|-------------|-------------------|------------|
| Development | 100%              | Yes        |
| Preview     | 100%              | No         |
| Production  | 20%               | No         |

## Architecture Note

Subscription hooks (`useOrderSubscription`, `usePositionSubscription`, etc.) receive `telemetryService` as a parameter because they run inside `AppServicesProvider` before the DI context is available. Other hooks can use `useTelemetry()`.
