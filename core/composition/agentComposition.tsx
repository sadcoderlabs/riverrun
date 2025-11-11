import React, { createContext, useContext, useMemo, useCallback } from 'react';
import * as hl from '@nktkas/hyperliquid';

import { AgentService } from '../contexts/agent/application/agentService';
import type { AgentPort } from '../contexts/agent/ports/agentPort';
import type { ActiveWallet } from '../contexts/wallet/ports/types';
import { getMasterExchangeClient as getMasterExchangeClientGetter } from '@/lib/hyperliquid/client/getter';
import { useWalletComposition } from './walletComposition';

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
  // Create dependency functions for AgentService
  // ==========================

  /**
   * Get master exchange client for the current active wallet
   */
  const getMasterExchangeClient = useCallback(async (): Promise<hl.ExchangeClient | undefined> => {
    try {
      const wallet = await walletService.active();
      if (!wallet) {
        return undefined;
      }

      const provider = await wallet.getProvider();
      if (!provider) {
        return undefined;
      }

      const signer = await provider.getSigner();

      // Use cached ExchangeClient - only creates new instance if wallet changed
      return getMasterExchangeClientGetter(wallet.address, signer);
    } catch (error) {
      console.error('Failed to get master exchange client:', error);
      return undefined;
    }
  }, [walletService]);

  /**
   * Get the currently active wallet
   */
  const getActiveWallet = useCallback(async (): Promise<ActiveWallet | undefined> => {
    try {
      return await walletService.active();
    } catch (error) {
      console.error('Failed to get active wallet:', error);
      return undefined;
    }
  }, [walletService]);

  // ==========================
  // Compose Agent Service
  // ==========================

  const agentService = useMemo(() => {
    return new AgentService(getMasterExchangeClient, getActiveWallet);
  }, [getMasterExchangeClient, getActiveWallet]);

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
