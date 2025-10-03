import * as hl from '@nktkas/hyperliquid';
import { useAppKitProvider } from '@reown/appkit-ethers-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AgentClientContext, setupAgentClients } from '@/lib/hyperliquid/agent';

interface UseHyperliquidAgentOptions {
  autoRefresh?: boolean;
}

interface UseHyperliquidAgentResult {
  requiresAgentApproval: boolean | undefined;
  isCheckingApproval: boolean;
  refreshApprovalStatus: () => Promise<void>;
  getAgentClients: (autoApprove?: boolean) => Promise<AgentClientContext>;
  ensureAgentApproved: () => Promise<AgentClientContext>;
  transport: hl.HttpTransport;
  infoClient: hl.InfoClient;
  walletProvider: ReturnType<typeof useAppKitProvider>['walletProvider'];
}

export function useHyperliquidAgent(
  options: UseHyperliquidAgentOptions = {},
): UseHyperliquidAgentResult {
  const { autoRefresh = true } = options;
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

  const refreshApprovalStatus = useCallback(async () => {
    if (!walletProvider) {
      setRequiresAgentApproval(undefined);
      return;
    }

    setIsCheckingApproval(true);
    try {
      const { isAgentApproved } = await setupAgentClients({
        walletProvider,
        transport,
        infoClient,
        autoApprove: false,
      });

      setRequiresAgentApproval(!isAgentApproved);
    } catch (error) {
      console.error('Error checking agent approval status', error);
      setRequiresAgentApproval(undefined);
    } finally {
      setIsCheckingApproval(false);
    }
  }, [walletProvider, transport, infoClient]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    void refreshApprovalStatus();
  }, [autoRefresh, refreshApprovalStatus]);

  const getAgentClients = useCallback(
    async (autoApprove = false) => {
      if (!walletProvider) {
        throw new Error('Wallet provider not available');
      }

      const context = await setupAgentClients({
        walletProvider,
        transport,
        infoClient,
        autoApprove,
      });

      setRequiresAgentApproval(!context.isAgentApproved);
      return context;
    },
    [walletProvider, transport, infoClient],
  );

  const ensureAgentApproved = useCallback(async () => {
    return getAgentClients(true);
  }, [getAgentClients]);

  return useMemo(
    () => ({
      requiresAgentApproval,
      isCheckingApproval,
      refreshApprovalStatus,
      getAgentClients,
      ensureAgentApproved,
      transport,
      infoClient,
      walletProvider,
    }),
    [
      ensureAgentApproved,
      getAgentClients,
      infoClient,
      isCheckingApproval,
      refreshApprovalStatus,
      requiresAgentApproval,
      transport,
      walletProvider,
    ],
  );
}
