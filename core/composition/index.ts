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
export { useAgentContext } from '../contexts/agent/reactNative/useAgentContext';
export type { UseAgentContextResult } from '../contexts/agent/reactNative/useAgentContext';

export {
  BuilderFeeCompositionProvider,
  useBuilderFeeComposition,
} from '../contexts/builderFee/reactNative/builderFeeComposition';
export { useBuilderFeeContext } from '../contexts/builderFee/reactNative/useBuilderFeeContext';
export type { UseBuilderFeeContextResult } from '../contexts/builderFee/reactNative/useBuilderFeeContext';
export { getBuilderParam } from '../contexts/builderFee/config';
