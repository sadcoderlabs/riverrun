/**
 * Composition Root - Dependency Injection
 *
 * This module provides the composition root for hexagonal architecture,
 * wiring together ports, adapters, and application logic.
 */

// Unified composition provider (recommended)
export { AppCompositionProvider } from './appComposition';

// Individual context providers (for advanced use cases or testing)
export {
  WalletCompositionProvider,
  useWalletComposition,
} from '../contexts/wallet/reactNative/walletComposition';
export { useWalletContext } from '../contexts/wallet/reactNative/useWalletContext';
export type { UseWalletContextResult } from '../contexts/wallet/reactNative/useWalletContext';

export {
  AgentCompositionProvider,
  useAgentComposition,
} from '../contexts/agent/reactNative/agentComposition';
export { useAgent } from '../contexts/agent/reactNative/useAgent';
export type { UseAgentResult } from '../contexts/agent/reactNative/useAgent';

export {
  BuilderFeeCompositionProvider,
  useBuilderFeeComposition,
} from '../contexts/builderFee/reactNative/builderFeeComposition';
export { useBuilderFee } from '../contexts/builderFee/reactNative/useBuilderFee';
export type { UseBuilderFeeResult } from '../contexts/builderFee/reactNative/useBuilderFee';
export { getBuilderParam } from '../contexts/builderFee/config';

export {
  ReferralCompositionProvider,
  useReferralComposition,
} from '../contexts/referral/reactNative/referralComposition';
export { useReferral } from '../contexts/referral/reactNative/useReferral';
export type { UseReferralResult } from '../contexts/referral/reactNative/useReferral';
export { REFERRAL_CONFIG } from '../contexts/referral/config';
