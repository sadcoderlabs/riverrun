# Environment Variables Management

This document describes how we manage environment variables following [Expo's official best practices](https://docs.expo.dev/build-reference/variables/).

## Core Concepts

### When to Use `EXPO_PUBLIC_` Prefix

**Use `EXPO_PUBLIC_` when:**

- You need the value **directly in your JavaScript code** (e.g., API URLs, feature flags)
- The value is **not sensitive** (can be public)
- Example: `process.env.EXPO_PUBLIC_API_URL`

**Don't use `EXPO_PUBLIC_` when:**

- The value is **sensitive** (API keys, tokens)
- You only need it in `app.config.ts`
- You want to pass it to runtime via `expo.extra`

### Build-time vs Runtime Variables

**Build-time (available in `app.config.ts`):**

```typescript
// All process.env variables are available during build
const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
  extra: {
    // Pass to runtime via expo.extra
    segmentWriteKey: process.env.SEGMENT_WRITE_KEY,
  },
};
```

**Runtime (available in your app code):**

```typescript
// Only EXPO_PUBLIC_* variables are available
const apiUrl = process.env.EXPO_PUBLIC_API_URL;

// Or via expo.extra (set in app.config.ts)
import Constants from 'expo-constants';
const segmentKey = Constants.expoConfig?.extra?.segmentWriteKey;
```

### How `.env` Files Work

| Command                                | Uses `.env` files? | Uses EAS variables? |
| -------------------------------------- | ------------------ | ------------------- |
| `expo start`                           | ✅ Yes             | ❌ No               |
| `eas build --profile preview`          | ❌ No              | ✅ Yes              |
| `eas update --environment preview`     | ❌ No              | ✅ Yes              |
| `eas update` (without `--environment`) | ✅ Yes             | ❌ No               |

**Key takeaway:** Always use `--environment` flag with `eas update` to ensure consistency with builds.

## Our Environment Variables

| Variable                      | Type       | Visibility | Used In                      |
| ----------------------------- | ---------- | ---------- | ---------------------------- |
| `APP_VARIANT`                 | Build-time | Plain text | `app.config.ts`              |
| `SEGMENT_WRITE_KEY`           | Build-time | Sensitive  | `app.config.ts` (via extra)  |
| `EXPO_PUBLIC_GIT_COMMIT_HASH` | Runtime    | -          | Injected during build/update |
| `SENTRY_AUTH_TOKEN`           | Build-time | Sensitive  | Build process only           |

## Quick Start

### 1. Setup EAS Environment Variables

Visit [EAS Dashboard](https://expo.dev/accounts/[account]/projects/[project]/environment-variables) and create variables for each environment (development, preview, production):

- `APP_VARIANT` = `development` / `preview` / `production` (Plain text)
- `SEGMENT_WRITE_KEY` = your segment key (Sensitive)
- `SENTRY_AUTH_TOKEN` = your sentry token (Sensitive)

### 2. Local Development

```bash
# Pull environment variables from EAS
eas env:pull --environment development

# Start development server (reads .env.local automatically)
expo start
```

### 3. Publishing Updates

```bash
# Use our update script (recommended)
pnpm update:preview

# This runs:
# EXPO_PUBLIC_GIT_COMMIT_HASH=$(git rev-parse --short HEAD) \
#   eas update --environment preview --channel preview
```

## Best Practices

### ✅ Do

- Always use `--environment` flag with `eas update`
- Use `eas env:pull` to sync variables locally
- Keep `.env.local` in `.gitignore` (already configured)
- Use `EXPO_PUBLIC_` only for public, non-sensitive values

### ❌ Don't

- Don't commit `.env` files to git
- Don't use `dotenv.config()` in `app.config.ts` (no longer needed)
- Don't store secrets in `EXPO_PUBLIC_` variables (they're visible in compiled app)
- Don't run `eas update` without `--environment` flag

## Troubleshooting

**Environment variables not available during `eas update`:**

Make sure you're using the `--environment` flag:

```bash
eas update --environment preview  # ✅ Correct
eas update                         # ❌ Will use .env files instead
```

**Variables not available in `app.config.ts` locally:**

Pull the latest environment variables:

```bash
eas env:pull --environment development
```

## References

- [Expo Environment Variables Guide](https://docs.expo.dev/guides/environment-variables/)
- [EAS Environment Variables](https://docs.expo.dev/build-reference/variables/)
