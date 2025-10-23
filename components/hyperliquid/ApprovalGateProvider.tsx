import { useHyperliquidAgent } from '@/hooks/useHyperliquidAgent';
import * as hl from '@nktkas/hyperliquid';
import { useAppKitProvider } from '@reown/appkit-ethers-react-native';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { Alert } from 'react-native';

interface ApprovalGateProviderProps {
  children: React.ReactNode;
}

interface ApprovalGateContextValue {
  withAgentApproval: (
    action: (exchangeClient: hl.ExchangeClient) => Promise<void> | void,
  ) => Promise<boolean>;
  walletProvider: ReturnType<typeof useAppKitProvider>['walletProvider'];
  infoClient: ReturnType<typeof useHyperliquidAgent>['infoClient'];
}

const ApprovalGateContext = createContext<ApprovalGateContextValue | undefined>(undefined);

export function ApprovalGateProvider({ children }: ApprovalGateProviderProps) {
  const { getAgentExchangeClient, infoClient } = useHyperliquidAgent();
  const { walletProvider } = useAppKitProvider();

  const withAgentApproval = useCallback<ApprovalGateContextValue['withAgentApproval']>(
    async action => {
      if (!walletProvider) {
        Alert.alert('Wallet not connected', 'Please connect your wallet to continue.');
        return false;
      }

      try {
        const exchangeClient = await getAgentExchangeClient();

        if (!exchangeClient) {
          // User cancelled or approval failed
          return false;
        }

        await Promise.resolve(action(exchangeClient));
        return true;
      } catch (error) {
        console.error('Action execution failed', error);
        Alert.alert('Action Failed', error instanceof Error ? error.message : 'Please try again.');
        return false;
      }
    },
    [getAgentExchangeClient, walletProvider],
  );

  const value = useMemo<ApprovalGateContextValue>(
    () => ({
      withAgentApproval,
      walletProvider,
      infoClient,
    }),
    [withAgentApproval, walletProvider, infoClient],
  );

  return <ApprovalGateContext.Provider value={value}>{children}</ApprovalGateContext.Provider>;
}

export function useApprovalGate() {
  const context = useContext(ApprovalGateContext);

  if (!context) {
    throw new Error('useApprovalGate must be used within an ApprovalGateProvider');
  }

  return context;
}
