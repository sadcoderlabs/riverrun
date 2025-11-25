/**
 * App-Internal Module - Public API
 *
 * Unified export for all app-internal features including DI container and feature hooks.
 */

// ============================================================================
// DI Container
// ============================================================================
export { AppCompositionProvider, useContainer, AppServicesProvider } from './di';
export type { AppContainer, AppCradle } from './di';

// ============================================================================
// Feature Hooks
// ============================================================================

// Telemetry
export { useTelemetry } from './features/telemetry/hooks/useTelemetry';
export type { UseTelemetryResult } from './features/telemetry/hooks/useTelemetry';
export { useScreenTracking } from './features/telemetry/hooks/useScreenTracking';

// Wallet
export { useWallet } from './features/wallet/hooks/useWallet';
export type { UseWalletResult } from './features/wallet/hooks/useWallet';
export {
  WalletCompositionProvider,
  useWalletComposition,
} from './features/wallet/components/walletComposition';

// Market
export { useMarket } from './features/market/hooks/useMarket';
export type { UseMarketResult } from './features/market/hooks/useMarket';
export { useMarketStore } from './features/market/hooks/useMarketStore';

// Agent
export { useAgent } from './features/agent/hooks/useAgent';
export type { UseAgentResult } from './features/agent/hooks/useAgent';

// Builder Fee
export { useBuilderFee } from './features/builderFee/hooks/useBuilderFee';
export type { UseBuilderFeeResult } from './features/builderFee/hooks/useBuilderFee';
export { getBuilderParam } from '@/contexts/builderFee/config';

// Referral
export { useReferral } from './features/referral/hooks/useReferral';
export type { UseReferralResult } from './features/referral/hooks/useReferral';
export { useReferralHintsStore } from '@/contexts/referral/adapters/referralHintsStore';
export { REFERRAL_CONFIG } from '@/contexts/referral/config';

// Bridge
export { useBridge } from './features/bridge/hooks/useBridge';
export type { UseBridgeResult } from './features/bridge/hooks/useBridge';
export { ARBITRUM_CONFIG, BRIDGE_LIMITS, BRIDGE_FEES } from '@/contexts/bridge/config';

// Margin
export { useMargin } from './features/margin/hooks/useMargin';
export type { UseMarginResult } from './features/margin/hooks/useMargin';
export { useMarginStore } from './features/margin/hooks/useMarginStore';

// Order
export { useOrder } from './features/order/hooks/useOrder';
export type { UseOrderResult } from './features/order/hooks/useOrder';
export { useOrderStore } from './features/order/hooks/useOrderStore';
export {
  useOrderValue,
  useMarginRequired,
  useOrderValidation,
  useOrderCount,
  useAvailableToTrade,
} from './features/order/hooks';

// History
export { useHistory } from './features/history/hooks/useHistory';
export { useHistoryStore } from './features/history/hooks/useHistoryStore';

// Position
export { usePositionStore } from './features/position/hooks/usePositionStore';

// ============================================================================
// Type Exports
// ============================================================================

// Telemetry Types
export type {
  TelemetryUser,
  TelemetryEventName,
  TelemetryEventProps,
  ScreenName,
  ScreenProps,
  TelemetryErrorContext,
  SpanName,
  SpanContext,
} from '@/contexts/telemetry/ports/types';

// History Types
export type { Fill } from '@/contexts/history/ports/types';

// Environment
export {
  appVariant,
  isDevelopmentBuild,
  isPreviewBuild,
  isProductionBuild,
  features,
} from '@/config/environment';
export type { AppVariant } from '@/config/environment';
