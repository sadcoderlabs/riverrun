# Riverrun

Riverrun is a mobile trading application for [Hyperliquid](https://hyperliquid.xyz), built with React Native and Expo.

## License & Background

This project was developed by the original Perpetual Protocol team under the product name **PERP GO**. After Perpetual Protocol was [transferred to a new team](https://gov.perp.com/discussion/1312093-r), this project was not included in the transfer and has been open sourced.

**License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (Creative Commons Attribution 4.0 International)

> **Important:** The "PERP" brand has been transferred to a new team. If you fork and deploy this project, **do not use the PERP brand**. See [REBRANDING.md](REBRANDING.md) for details on what needs to be changed.

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 10+ (`npm install -g pnpm@latest-10` or `brew install pnpm`)
- iOS Simulator (macOS) or Android Emulator
- EAS CLI (`pnpm add -g eas-cli`)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Pull environment variables
eas env:pull --environment development

# 3. Start the development server
pnpm start
```

Then press `i` for iOS simulator or `a` for Android emulator.

### Development Build

For native feature development, you'll need a development build:

```bash
# Build for all platforms
pnpm run build:development

# Or build for specific platform
pnpm run build:development:ios
pnpm run build:development:android
```

## Project Structure

```
riverrun/
├── app/                    # Expo Router (file-based routing)
│   ├── (tabs)/            # Tab navigation screens
│   ├── (modal)/           # Modal screens
│   └── chart/             # Chart screens
│
├── contexts/              # Core business logic (Hexagonal Architecture)
│   ├── agent/             # Agent wallet management
│   ├── bridge/            # Cross-chain bridging
│   ├── builderFee/        # Builder fee management
│   ├── history/           # Trade history
│   ├── margin/            # Margin & leverage
│   ├── market/            # Market data
│   ├── order/             # Order management
│   ├── position/          # Position management
│   ├── referral/          # Referral system
│   └── telemetry/         # Error tracking & analytics
│
├── app-internal/          # React layer & DI
│   ├── di/                # Dependency Injection container
│   └── features/          # React hooks for each context
│
├── infra/                 # Infrastructure layer
│   └── hyperliquid/       # Hyperliquid API integration
│
├── components/            # Shared UI components
├── config/                # App configuration
└── docs/                  # Documentation
```

## Architecture

This project follows **Hexagonal Architecture** (Clean Architecture):

- **Contexts**: Pure business logic with ports & adapters
- **App-Internal**: React hooks and DI container
- **Infra**: External service integrations

For detailed architecture guide, see [docs/hexagonal-architecture-guide.md](docs/hexagonal-architecture-guide.md).

## Key Technologies

| Category   | Technology                     |
| ---------- | ------------------------------ |
| Framework  | Expo SDK 54, React Native 0.81 |
| Navigation | Expo Router (file-based)       |
| UI         | Tamagui                        |
| State      | Zustand                        |
| DI         | Awilix                         |
| Forms      | React Hook Form + Zod          |
| Wallet     | Privy, Reown (WalletConnect)   |
| API        | Hyperliquid SDK                |
| Telemetry  | Sentry                         |

## Development Workflow

### Branch Strategy

| Branch    | Purpose               | Auto-deploys to  |
| --------- | --------------------- | ---------------- |
| `develop` | Development & testing | Preview (OTA)    |
| `main`    | Production releases   | Production (OTA) |

### Common Commands

```bash
# Start dev server
pnpm start

# Lint & format
pnpm lint
pnpm format

# Run tests
pnpm test

# Build
pnpm run build:development    # Dev build
pnpm run build:preview        # Preview build
pnpm run build:production     # Production build

# OTA updates (usually handled by CI)
pnpm run update:preview
pnpm run update:production
```

## Documentation

| Document                                                             | Description                               |
| -------------------------------------------------------------------- | ----------------------------------------- |
| [Hexagonal Architecture Guide](docs/hexagonal-architecture-guide.md) | Architecture patterns & development guide |
| [Environment Variables](docs/env.md)                                 | Environment configuration                 |
| [Versioning](docs/versioning.md)                                     | Version management & release process      |
| [Telemetry Guidelines](docs/telemetry-guidelines.md)                 | Error tracking & analytics                |

## Coding Standards

See [.claude/coding-style.md](.claude/coding-style.md) and [.claude/naming-conventions.md](.claude/naming-conventions.md) for:

- File naming conventions
- TypeScript style (prefer `undefined` over `null`)
- Component patterns

## Troubleshooting

### Metro bundler issues

```bash
# Clear cache and restart
pnpm start --clear
```

### Environment variables not loading

```bash
# Re-pull from EAS
eas env:pull --environment development
```

### Build failures

Check that you have the latest EAS CLI:

```bash
pnpm add -g eas-cli
```
