# Riverrun: Crypto Futures Trading App

## Project Overview

Riverrun is a native mobile application designed to provide a seamless and intuitive trading experience for cryptocurrency futures, powered by Hyperliquid, a leading decentralized exchange (DEX) platform. The application aims to deliver a professional-grade trading experience with the convenience and accessibility of a mobile app.

## Technical Stack

- **UI Framework**: [Tamagui](https://tamagui.dev/) - A fully-featured UI kit for React Native and Web
- **Font System**: Inter font family (Regular, Medium, SemiBold, Bold)
- **Theme System**: Custom light/dark themes with accent colors and semantic variants (success, warning, error)

## Design System Approach

Our design system is intentionally lean and focused on delivering a consistent, high-performance trading experience. We're building on top of Tamagui's foundation while creating custom components that are specifically tailored for trading interfaces.

### Core Principles

1. **Performance First**: Trading applications require immediate feedback and smooth interactions
2. **Cross-Platform Consistency**: Maintain a consistent look and feel across iOS and Android
3. **Trading-Specific UX**: Prioritize information density and quick access to critical trading functions
4. **Accessibility**: Ensure the app is usable by traders with varying abilities

## Theme Structure

The application uses a sophisticated theming system with:

- **Base Theme**: Light and dark color palettes with 12 color steps each
- **Accent Theme**: Green-focused accent colors for primary actions and highlights
- **Semantic Themes**: Success (green), Warning (yellow), and Error (red) for contextual feedback

## Component Extensions

When extending Tamagui components or creating new ones:

1. Follow the existing naming conventions and styling patterns
2. Ensure components work in both light and dark modes
3. Use the defined animation presets for consistent motion design
4. Implement proper accessibility attributes

## Hyperliquid Integration

As this app is powered by Hyperliquid DEX, UI components should be designed with consideration for:

- Real-time data visualization
- Order book displays
- Trade execution interfaces
- Position management
- Account/wallet information

## Getting Started

To work with this design system:

1. Review existing components in the codebase
2. Use the Tamagui configuration as a reference for styling
3. Follow the font and spacing scales defined in `tamagui.config.ts`
4. Test components in both light and dark modes

## Future Considerations

- Expansion of component library for trading-specific needs
- Performance optimizations for data-heavy screens
- Additional themes or customization options
- Enhanced animations for market data visualization

---

_This document serves as a living guide for the UI direction of Riverrun. As the project evolves, this document should be updated to reflect changes in design philosophy and implementation details._
