/**
 * Composition Root - Dependency Injection
 *
 * This module provides the composition root for hexagonal architecture,
 * wiring together ports, adapters, and application logic.
 */

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
