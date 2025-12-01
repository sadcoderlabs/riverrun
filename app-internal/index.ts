/**
 * App-Internal Module - Public API
 *
 * Unified export for all app-internal features including DI container and feature hooks.
 */

// ============================================================================
// DI Container
// ============================================================================
export { AppCompositionProvider, AppServicesProvider, useContainer } from './di';
export type { AppContainer, AppCradle } from './di';

// ============================================================================
// Feature Hooks
// ============================================================================

// Telemetry
export { useScreenTracking } from './features/telemetry/hooks/useScreenTracking';
export { useTelemetry } from './features/telemetry/hooks/useTelemetry';
export type { UseTelemetryResult } from './features/telemetry/hooks/useTelemetry';

// Wallet
export {
    WalletCompositionProvider,
    useWalletComposition
} from './features/wallet/components/walletComposition';
export { useWallet } from './features/wallet/hooks/useWallet';
export type { UseWalletResult } from './features/wallet/hooks/useWallet';

// Market
export { useMarket } from './features/market/hooks/useMarket';
export type { UseMarketResult } from './features/market/hooks/useMarket';
export { useMarketStore } from './features/market/hooks/useMarketStore';

// Agent
export { useAgent } from './features/agent/hooks/useAgent';
export type { UseAgentResult } from './features/agent/hooks/useAgent';

// Builder Fee
export { getBuilderParam } from '@/contexts/builderFee/config';
export { useBuilderFee } from './features/builderFee/hooks/useBuilderFee';
export type { UseBuilderFeeResult } from './features/builderFee/hooks/useBuilderFee';
export { useUserFees } from './features/builderFee/hooks/useUserFees';
export type { UseUserFeesResult } from './features/builderFee/hooks/useUserFees';

// Referral
export { useReferralHintsStore } from '@/contexts/referral/adapters/referralHintsStore';
export { REFERRAL_CONFIG } from '@/contexts/referral/config';
export { useReferral } from './features/referral/hooks/useReferral';
export type { UseReferralResult } from './features/referral/hooks/useReferral';

// Bridge
export { ARBITRUM_CONFIG, BRIDGE_FEES, BRIDGE_LIMITS } from '@/contexts/bridge/config';
export { useBridge } from './features/bridge/hooks/useBridge';
export type { UseBridgeResult } from './features/bridge/hooks/useBridge';

// Margin
export { useMargin } from './features/margin/hooks/useMargin';
export type { UseMarginResult } from './features/margin/hooks/useMargin';
export { useMarginStore } from './features/margin/hooks/useMarginStore';

// Order
export {
    useAvailableToTrade, useMarginRequired, useOrderCount, useOrderValidation, useOrderValue
} from './features/order/hooks';
export { useOrder } from './features/order/hooks/useOrder';
export type { UseOrderResult } from './features/order/hooks/useOrder';
export { useOrderStore } from './features/order/hooks/useOrderStore';

// History
export { useHistory } from './features/history/hooks/useHistory';
export { useHistoryStore } from './features/history/hooks/useHistoryStore';

// Position
export { usePositionStore } from './features/position/hooks/usePositionStore';

// Welcome
export { useWelcomeScreens, useWelcomeStore } from './features/welcome';
export type { UseWelcomeScreensResult } from './features/welcome/hooks/useWelcomeScreens';

// ============================================================================
// Type Exports
// ============================================================================

// Telemetry Types
export type {
    ScreenName,
    ScreenProps, SpanContext, SpanName, TelemetryErrorContext, TelemetryEventName,
    TelemetryEventProps, TelemetryUser
} from '@/contexts/telemetry/ports/types';

// History Types
export type { Fill } from '@/contexts/history/ports/types';

// BuilderFee Types
export type { UserFeeRates } from '@/contexts/builderFee/ports/types';

// Environment
export {
    appVariant, features, isDevelopmentBuild,
    isPreviewBuild,
    isProductionBuild
} from '@/config/environment';
export type { AppVariant } from '@/config/environment';

