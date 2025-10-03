import * as hl from '@nktkas/hyperliquid';
import { useAppKitProvider } from '@reown/appkit-ethers-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AgentClientContext, setupAgentClients } from '@/lib/hyperliquid/agent';

interface UseHyperliquidAgentResult {
  requiresAgentApproval: boolean | undefined;
  isCheckingApproval: boolean;
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

  useEffect(() => {
    if (!walletProvider) {
      setRequiresAgentApproval(undefined);
      setIsCheckingApproval(false);
      return;
    }

    let cancelled = false;
    setIsCheckingApproval(true);

    void getAgentContext()
      .catch(error => {
        console.error('Error checking agent approval status', error);
        if (!cancelled) {
          setRequiresAgentApproval(undefined);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCheckingApproval(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [walletProvider, getAgentContext]);

  return useMemo(
    () => ({
      requiresAgentApproval,
      isCheckingApproval,
      getAgentContext,
      transport,
      infoClient,
      walletProvider,
    }),
    [
      getAgentContext,
      infoClient,
      isCheckingApproval,
      requiresAgentApproval,
      transport,
      walletProvider,
    ],
  );
}
