/**
 * Composition Root - Temporary Barrel Export
 *
 * This is a temporary re-export file during the migration to app-internal structure.
 * It will be removed once all features are migrated.
 */

// DI Container
export { useContainer } from '../app-internal/di';

// Telemetry (migrated to app-internal/features/telemetry)
export { useTelemetry } from '../app-internal/features/telemetry/hooks/useTelemetry';
export type { UseTelemetryResult } from '../app-internal/features/telemetry/hooks/useTelemetry';
export { useTelemetryStore } from '../app-internal/features/telemetry/hooks/useTelemetryStore';
export {
  TelemetryCompositionProvider,
  useTelemetryComposition,
} from '../app-internal/features/telemetry/components/telemetryComposition';

// Wallet (migrated to app-internal/features/wallet)
export { useWalletContext } from '../app-internal/features/wallet/hooks/useWalletContext';
export type { UseWalletContextResult } from '../app-internal/features/wallet/hooks/useWalletContext';
export {
  WalletCompositionProvider,
  useWalletComposition,
} from '../app-internal/features/wallet/components/walletComposition';

// Market (not yet migrated)
export { useMarket } from '../contexts/market/reactNative/useMarket';
export type { UseMarketResult } from '../contexts/market/reactNative/useMarket';
export { useMarketStore } from '../contexts/market/reactNative/useMarketStore';

// Agent (not yet migrated)
export { useAgent } from '../contexts/agent/reactNative/useAgent';
export type { UseAgentResult } from '../contexts/agent/reactNative/useAgent';
export { useAgentStore } from '../contexts/agent/reactNative/useAgentStore';

// Builder Fee (not yet migrated)
export { useBuilderFee } from '../contexts/builderFee/reactNative/useBuilderFee';
export type { UseBuilderFeeResult } from '../contexts/builderFee/reactNative/useBuilderFee';
export { useBuilderFeeStore } from '../contexts/builderFee/reactNative/useBuilderFeeStore';
export { getBuilderParam } from '../contexts/builderFee/config';

// Referral (not yet migrated)
export { useReferral } from '../contexts/referral/reactNative/useReferral';
export type { UseReferralResult } from '../contexts/referral/reactNative/useReferral';
export { useReferralStore } from '../contexts/referral/reactNative/useReferralStore';
export { useReferralHintsStore } from '../contexts/referral/adapters/referralHintsStore';
export { REFERRAL_CONFIG } from '../contexts/referral/config';

// Bridge (not yet migrated)
export { useBridge } from '../contexts/bridge/reactNative/useBridge';
export type { UseBridgeResult } from '../contexts/bridge/reactNative/useBridge';
export { useBridgeStore } from '../contexts/bridge/reactNative/useBridgeStore';
export { ARBITRUM_CONFIG, BRIDGE_LIMITS, BRIDGE_FEES } from '../contexts/bridge/config';

// Margin (not yet migrated)
export { useMargin } from '../contexts/margin/reactNative/useMargin';
export type { UseMarginResult } from '../contexts/margin/reactNative/useMargin';
export { useMarginStore } from '../contexts/margin/reactNative/useMarginStore';

// Order (not yet migrated)
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
} from '../contexts/telemetry/ports/types';

// Environment
export {
  appVariant,
  isDevelopmentBuild,
  isPreviewBuild,
  isProductionBuild,
  features,
} from '../config/environment';
export type { AppVariant } from '../config/environment';
