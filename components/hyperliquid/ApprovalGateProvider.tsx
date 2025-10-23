import { useHyperliquidAgent } from '@/hooks/useHyperliquidAgent';
import type { AgentClientContext } from '@/lib/hyperliquid/agent';
import { useAppKitProvider } from '@reown/appkit-ethers-react-native';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { Alert } from 'react-native';

interface ApprovalGateProviderProps {
  children: React.ReactNode;
}

interface ApprovalGateContextValue {
  requiresAgentApproval: boolean | undefined;
  isCheckingApproval: boolean;
  withAgentApproval: (
    action: (context: AgentClientContext) => Promise<void> | void,
  ) => Promise<boolean>;
  walletProvider: ReturnType<typeof useAppKitProvider>['walletProvider'];
  infoClient: ReturnType<typeof useHyperliquidAgent>['infoClient'];
  getAgentContext: ReturnType<typeof useHyperliquidAgent>['getAgentContext'];
}

const ApprovalGateContext = createContext<ApprovalGateContextValue | undefined>(undefined);

export function ApprovalGateProvider({ children }: ApprovalGateProviderProps) {
  const agent = useHyperliquidAgent();
  const { walletProvider } = useAppKitProvider();

  const withAgentApproval = useCallback<ApprovalGateContextValue['withAgentApproval']>(
    async action => {
      if (!walletProvider) {
        Alert.alert('Wallet not connected', 'Please connect your wallet to continue.');
        return false;
      }

      const executeAction = async (context: AgentClientContext) => {
        await Promise.resolve(action(context));
      };

      const initialContext = await agent.getAgentContext();

      if (initialContext.isAgentApproved) {
        await executeAction(initialContext);
        return true;
      }

      return await new Promise<boolean>((resolve, reject) => {
        let settled = false;

        const approvalTitle = 'Agent approval required';
        const approvalMessage =
          'This action requires approving the agent first. Confirm to approve now.';
        const confirmLabel = 'Confirm';
        const cancelLabel = 'Cancel';
        const approvalErrorTitle = 'Agent approval failed';

        Alert.alert(approvalTitle, approvalMessage, [
          {
            text: cancelLabel,
            style: 'cancel',
            onPress: () => {
              if (!settled) {
                settled = true;
                resolve(false);
              }
            },
          },
          {
            text: confirmLabel,
            onPress: () => {
              void (async () => {
                try {
                  await initialContext.masterExchangeClient.approveAgent({
                    agentAddress: initialContext.agentAddress,
                    agentName: initialContext.agentName,
                  });

                  const approvedContext = await agent.getAgentContext();

                  if (!approvedContext.isAgentApproved) {
                    throw new Error('Agent approval not confirmed.');
                  }

                  await executeAction(approvedContext);

                  if (!settled) {
                    settled = true;
                    resolve(true);
                  }
                } catch (error) {
                  console.error('Agent approval failed', error);
                  Alert.alert(
                    approvalErrorTitle,
                    error instanceof Error ? error.message : 'Please try again.',
                  );

                  if (!settled) {
                    settled = true;
                    reject(error instanceof Error ? error : new Error('Agent approval failed'));
                  }
                }
              })();
            },
          },
        ]);
      });
    },
    [agent.getAgentContext, walletProvider],
  );

  const value = useMemo<ApprovalGateContextValue>(
    () => ({
      requiresAgentApproval: agent.requiresAgentApproval,
      isCheckingApproval: agent.isCheckingApproval,
      withAgentApproval,
      walletProvider,
      infoClient: agent.infoClient,
      getAgentContext: agent.getAgentContext,
    }),
    [agent, withAgentApproval, walletProvider],
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
