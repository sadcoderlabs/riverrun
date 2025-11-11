import React, { createContext, useContext, useMemo } from 'react';

import { AgentService } from '../application/agentService';
import { HyperliquidAdapter } from '../../../infra/hyperliquid/hyperliquidAdapter';
import type { AgentPort } from '../ports/agentPort';
import { useWalletComposition } from '@/core/contexts/wallet/reactNative/walletComposition';

interface AgentCompositionContextValue {
  /**
   * Agent service for business operations.
   * Always available when the provider has rendered children.
   */
  agentService: AgentPort;
}

const AgentCompositionContext = createContext<AgentCompositionContextValue | undefined>(undefined);

/**
 * AgentCompositionProvider - Dependency Injection Container for Agent
 *
 * This is the composition root for the agent context in hexagonal architecture.
 * It wires together:
 * - Wallet dependencies (via WalletCompositionProvider)
 * - Agent service (core business logic)
 *
 * This provider should be placed inside WalletCompositionProvider.
 *
 * @example
 * ```tsx
 * <WalletCompositionProvider>
 *   <AgentCompositionProvider>
 *     <YourApp />
 *   </AgentCompositionProvider>
 * </WalletCompositionProvider>
 * ```
 */
export function AgentCompositionProvider({ children }: { children: React.ReactNode }) {
  const { walletService } = useWalletComposition();

  // ==========================
  // Compose Agent Service
  // ==========================

  const agentService = useMemo(() => {
    // Create Hyperliquid adapter (shared infrastructure adapter)
    const hyperliquidAdapter = new HyperliquidAdapter();

    // AgentService depends on WalletPort and HyperliquidAdapter
    return new AgentService(walletService, hyperliquidAdapter);
  }, [walletService]);

  const value = {
    agentService,
  };

  return (
    <AgentCompositionContext.Provider value={value}>{children}</AgentCompositionContext.Provider>
  );
}

/**
 * useAgentComposition - Access the agent service from context
 *
 * This is an internal hook used by the public agent hooks.
 * Components should use useAgentContext() instead.
 */
export function useAgentComposition(): AgentCompositionContextValue {
  const context = useContext(AgentCompositionContext);
  if (!context) {
    throw new Error('useAgentComposition must be used within AgentCompositionProvider');
  }
  return context;
}
