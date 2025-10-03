import * as hl from '@nktkas/hyperliquid';
import { useAppKitProvider } from '@reown/appkit-ethers-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AgentClientContext, setupAgentClients } from '@/lib/hyperliquid/agent';

interface UseHyperliquidAgentResult {
  requiresAgentApproval: boolean | undefined;
  isCheckingApproval: boolean;
  refreshApprovalStatus: () => Promise<void>;
  getAgentContext: () => Promise<AgentClientContext>;
  transport: hl.HttpTransport;
  infoClient: hl.InfoClient;
  walletProvider: ReturnType<typeof useAppKitProvider>['walletProvider'];
}

export function useHyperliquidAgent(): UseHyperliquidAgentResult {
  const { walletProvider } = useAppKitProvider();

  const transportRef = useRef<hl.HttpTransport | undefined>(undefined);
  const infoClientRef = useRef<hl.InfoClient | undefined>(undefined);

  if (!transportRef.current) {
    transportRef.current = new hl.HttpTransport();
  }

  const transport = transportRef.current;
  if (!infoClientRef.current) {
    infoClientRef.current = new hl.InfoClient({ transport });
  }

  const infoClient = infoClientRef.current;

  const [requiresAgentApproval, setRequiresAgentApproval] = useState<boolean | undefined>(
    undefined,
  );
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);

  const getAgentContext = useCallback(async () => {
    if (!walletProvider) {
      throw new Error('Wallet provider not available');
    }

    const context = await setupAgentClients({
      walletProvider,
      transport,
      infoClient,
    });

    setRequiresAgentApproval(!context.isAgentApproved);
    return context;
  }, [walletProvider, transport, infoClient]);

  const refreshApprovalStatus = useCallback(async () => {
    if (!walletProvider) {
      setRequiresAgentApproval(undefined);
      return;
    }

    setIsCheckingApproval(true);
    try {
      await getAgentContext();
    } catch (error) {
      console.error('Error checking agent approval status', error);
      setRequiresAgentApproval(undefined);
    } finally {
      setIsCheckingApproval(false);
    }
  }, [walletProvider, getAgentContext]);

  useEffect(() => {
    void refreshApprovalStatus();
  }, [refreshApprovalStatus]);

  return useMemo(
    () => ({
      requiresAgentApproval,
      isCheckingApproval,
      refreshApprovalStatus,
      getAgentContext,
      transport,
      infoClient,
      walletProvider,
    }),
    [
      getAgentContext,
      infoClient,
      isCheckingApproval,
      refreshApprovalStatus,
      requiresAgentApproval,
      transport,
      walletProvider,
    ],
  );
}
