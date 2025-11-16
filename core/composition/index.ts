/**
 * Composition Root - Dependency Injection
 *
 * This module provides the composition root for hexagonal architecture,
 * wiring together ports, adapters, and application logic.
 *
 * ## Store Hooks vs Business Hooks
 *
 * ### Store Hooks (useXxxStore)
 * - Direct access to state with custom selectors
 * - Optimal performance - only re-renders when selected fields change
 * - Use for state access in components
 *
 * ### Business Hooks (useXxx)
 * - Business operations and UI interactions
 * - Loading states for UI
 * - Use for actions and operations
 *
 * @example
 * ```typescript
 * // State access - precise subscriptions
 * const agentAddress = useAgentStore(state => state.agentAddress);
 * const isApproved = useAgentStore(state => state.isApproved);
 *
 * // Business operations
 * const { approve, isLoading } = useAgent();
 * ```
 */

// Unified composition provider (recommended)
export { AppCompositionProvider } from './appComposition';

// DI Container - Service Access
export { useContainer, AppServicesProvider } from '../di';
export type { AppCradle, AppContainer } from '../di';

// Individual context providers (for advanced use cases or testing)

// Environment Configuration
export {
  appVariant,
  isDevelopmentBuild,
  isPreviewBuild,
  isProductionBuild,
  features,
} from '../config/environment';
export type { AppVariant } from '../config/environment';

// Telemetry Context
export {
  TelemetryCompositionProvider,
  useTelemetryComposition,
} from '../contexts/telemetry/reactNative/telemetryComposition';
export { useTelemetry } from '../contexts/telemetry/reactNative/useTelemetry';
export type { UseTelemetryResult } from '../contexts/telemetry/reactNative/useTelemetry';
export { useTelemetryStore } from '../contexts/telemetry/reactNative/useTelemetryStore';

// Telemetry Types (Type-safe events and screens)
export type {
  // User
  TelemetryUser,
  // Events
  TelemetryEventName,
  TelemetryEventProps,
  // Screens
  ScreenName,
  ScreenProps,
  // Errors
  TelemetryErrorContext,
  // Performance
  SpanName,
  SpanContext,
} from '../contexts/telemetry/ports/types';

// Wallet Context
export {
  WalletCompositionProvider,
  useWalletComposition,
} from '../contexts/wallet/reactNative/walletComposition';
export { useWalletContext } from '../contexts/wallet/reactNative/useWalletContext';
export type { UseWalletContextResult } from '../contexts/wallet/reactNative/useWalletContext';

export { MarketCompositionProvider } from '../contexts/market/reactNative/marketComposition';
export { useMarket } from '../contexts/market/reactNative/useMarket';
export type { UseMarketResult } from '../contexts/market/reactNative/useMarket';
export { useMarketStore } from '../contexts/market/reactNative/useMarketStore';

export {
  AgentCompositionProvider,
  useAgentComposition,
} from '../contexts/agent/reactNative/agentComposition';
export { useAgent } from '../contexts/agent/reactNative/useAgent';
export type { UseAgentResult } from '../contexts/agent/reactNative/useAgent';
export { useAgentStore } from '../contexts/agent/reactNative/useAgentStore';

export {
  BuilderFeeCompositionProvider,
  useBuilderFeeComposition,
} from '../contexts/builderFee/reactNative/builderFeeComposition';
export { useBuilderFee } from '../contexts/builderFee/reactNative/useBuilderFee';
export type { UseBuilderFeeResult } from '../contexts/builderFee/reactNative/useBuilderFee';
export { useBuilderFeeStore } from '../contexts/builderFee/reactNative/useBuilderFeeStore';
export { getBuilderParam } from '../contexts/builderFee/config';

export {
  ReferralCompositionProvider,
  useReferralComposition,
} from '../contexts/referral/reactNative/referralComposition';
export { useReferral } from '../contexts/referral/reactNative/useReferral';
export type { UseReferralResult } from '../contexts/referral/reactNative/useReferral';
export { useReferralStore } from '../contexts/referral/reactNative/useReferralStore';
export { useReferralHintsStore } from '../contexts/referral/adapters/referralHintsStore';
export { REFERRAL_CONFIG } from '../contexts/referral/config';

export {
  BridgeCompositionProvider,
  useBridgeComposition,
} from '../contexts/bridge/reactNative/bridgeComposition';
export { useBridge } from '../contexts/bridge/reactNative/useBridge';
export type { UseBridgeResult } from '../contexts/bridge/reactNative/useBridge';
export { useBridgeStore } from '../contexts/bridge/reactNative/useBridgeStore';
export { ARBITRUM_CONFIG, BRIDGE_LIMITS, BRIDGE_FEES } from '../contexts/bridge/config';

export {
  MarginCompositionProvider,
  useMarginComposition,
} from '../contexts/margin/reactNative/marginComposition';
export { useMargin } from '../contexts/margin/reactNative/useMargin';
export type { UseMarginResult } from '../contexts/margin/reactNative/useMargin';
export { useMarginStore } from '../contexts/margin/reactNative/useMarginStore';

export {
  OrderCompositionProvider,
  useOrderContext,
} from '../contexts/order/reactNative/orderComposition';
export { useOrder } from '../contexts/order/reactNative/useOrder';
export type { UseOrderResult } from '../contexts/order/reactNative/useOrder';
export { useOrderStore } from '../contexts/order/reactNative/useOrderStore';
export {
  useOrderValue,
  useMarginRequired,
  useOrderValidation,
  useOrderCount,
  useAvailableToTrade,
} from '../contexts/order/reactNative';
