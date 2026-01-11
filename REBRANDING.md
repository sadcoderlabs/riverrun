# Rebranding Guide

This document explains how to rebrand this project if you fork and deploy it.

## Background

**Riverrun** was developed by the original Perpetual Protocol team under the product name **PERP GO**. After Perpetual Protocol was [transferred to a new team](https://gov.perp.com/discussion/1312093-r), this project was not included in the transfer. The original team has decided to open source the codebase.

## Important Notice

This codebase is licensed under **CC BY 4.0** (Creative Commons Attribution 4.0 International).

However, **the "PERP" and "PERP GO" brand names have been transferred to a new team**. If you fork this repository and deploy it, **you must not use the PERP brand** (including "PERP GO", "Perpetual Protocol", or any similar naming).

## What Needs to Be Changed

If you want to deploy your own version of this app, you'll need to update the following brand-related content:

### 1. App Name & Identifiers

| File            | Content                                         | Description              |
| --------------- | ----------------------------------------------- | ------------------------ |
| `app.config.ts` | `PERP GO`, `PERP GO (Dev)`, `PERP GO (Preview)` | App display name         |
| `app.config.ts` | `com.perpetualprotocol.riverrun.*`              | Bundle ID / Package name |
| `app.json`      | `"slug": "riverrun"`                            | Expo slug                |
| `app.json`      | `"scheme": "riverrun"`                          | Deep link URL scheme     |
| `app.json`      | `"owner": "perpetual-protocol"`                 | Expo account owner       |
| `package.json`  | `"name": "riverrun"`                            | NPM package name         |

### 2. URLs & External Resources

| File                                                     | Content                      | Description                |
| -------------------------------------------------------- | ---------------------------- | -------------------------- |
| `infra/reown/appKitConfig.ts`                            | `name: 'PERP GO'`            | WalletConnect display name |
| `infra/reown/appKitConfig.ts`                            | `url: 'https://go.perp.com'` | App website URL            |
| `infra/reown/appKitConfig.ts`                            | `icons: [...]`               | App icon URL               |
| `infra/reown/appKitConfig.ts`                            | `native: 'riverrun://'`      | Deep link scheme           |
| `app.config.ts`                                          | `https://api.go.perp.com`    | Backend API URL            |
| `app-internal/components/settings/ExportWalletModal.tsx` | `https://go-export.perp.com` | Wallet export URL          |

### 3. Agent Name

| File                          | Content                                | Description                |
| ----------------------------- | -------------------------------------- | -------------------------- |
| `contexts/agent/constants.ts` | `DEFAULT_AGENT_NAME = 'PERP GO Agent'` | Trading agent display name |

### 4. Third-Party Services (Create New Accounts)

You'll need to create new accounts for these services:

| Service      | Files       | What to Update                                                  |
| ------------ | ----------- | --------------------------------------------------------------- |
| **Expo/EAS** | `app.json`  | `projectId`, `updates.url`, `owner`                             |
| **Sentry**   | `app.json`  | `sentryDsn`, `organization`, `project`                          |
| **Intercom** | `app.json`  | `appId`, `androidApiKey`, `iosApiKey` (or remove if not needed) |
| **Reown**    | Environment | `EXPO_PUBLIC_REOWN_PROJECT_ID`                                  |
| **Segment**  | Environment | `SEGMENT_WRITE_KEY` (or remove if not needed)                   |

### 5. Image Assets (Replace with Your Brand)

| File                                                     | Description                        |
| -------------------------------------------------------- | ---------------------------------- |
| `app-internal/assets/images/icon.png`                    | Main app icon                      |
| `app-internal/assets/images/splash-icon.png`             | Splash screen icon                 |
| `app-internal/assets/images/favicon.png`                 | Web favicon                        |
| `app-internal/assets/images/android-icon-foreground.png` | Android adaptive icon (foreground) |
| `app-internal/assets/images/android-icon-background.png` | Android adaptive icon (background) |
| `app-internal/assets/images/android-icon-monochrome.png` | Android monochrome icon            |
| `app-internal/assets/images/perp-go-logo-color.svg`      | Brand logo SVG                     |

### 6. iOS Permission Descriptions

| File       | Content                                           |
| ---------- | ------------------------------------------------- |
| `app.json` | `NSMicrophoneUsageDescription` mentions "PERP GO" |

### 7. Local Storage Keys (Optional)

| File                                      | Content              | Description        |
| ----------------------------------------- | -------------------- | ------------------ |
| `contexts/agent/adapters/agentPkStore.ts` | `riverrun-agent-pk-` | Storage key prefix |

### 8. Documentation

Update or remove references to "Riverrun", "PERP GO", or "Perpetual Protocol" in:

- `README.md`
- `docs/ui-direction/about.md`
- `docs/versioning.md`
- `docs/hexagonal-architecture-guide.md`
- Other markdown files in `docs/`

## Quick Search Commands

To find all brand references in the codebase:

```bash
# Search for PERP GO
grep -r -i "perp go" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" . | grep -v node_modules

# Search for perp.com URLs
grep -r "perp\.com" --include="*.ts" --include="*.tsx" --include="*.json" . | grep -v node_modules

# Search for perpetualprotocol
grep -r "perpetualprotocol" --include="*.ts" --include="*.tsx" --include="*.json" . | grep -v node_modules

# Search for riverrun
grep -r "riverrun" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" . | grep -v node_modules | grep -v ".git"
```

## Backend API (Optional)

This app references a backend API (`api.go.perp.com`) which is **only used for push notifications** (device registration/unregistration). The backend is **not included** in this repository.

**Good news:** The backend is completely optional. All core features (trading, wallet, deposits, withdrawals) work without it. If you skip the backend setup:

- Push notifications will be disabled
- Everything else works normally

If you want push notifications, you can build your own backend. See `infra/backend/` for the simple API interface (just 3 endpoints: register, unregister, status).

## Questions?

If you have questions about rebranding or the codebase, feel free to open an issue on this repository.
