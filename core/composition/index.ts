/**
 * Composition Root - Dependency Injection
 *
 * This module provides the composition root for hexagonal architecture,
 * wiring together ports, adapters, and application logic.
 */

export { WalletCompositionProvider, useWalletComposition } from './walletComposition';
export { useWalletContext } from './hooks/useWalletContext';
export type { UseWalletContextResult } from './hooks/useWalletContext';

export { AgentCompositionProvider, useAgentComposition } from './agentComposition';
export { useAgentContext } from './hooks/useAgentContext';
export type { UseAgentContextResult } from './hooks/useAgentContext';
