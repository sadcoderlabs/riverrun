import { useHyperliquidAgent } from '@/hooks/useHyperliquidAgent';
import type { AgentClientContext } from '@/lib/hyperliquid/agent';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert } from 'react-native';

interface ApprovalGateProviderProps {
  children: React.ReactNode;
}

interface ApprovalGateContextValue {
  requiresAgentApproval: boolean | undefined;
  isCheckingApproval: boolean;
  isEnsuringApproval: boolean;
  withAgentApproval: (
    action: (context: AgentClientContext) => Promise<void> | void,
  ) => Promise<boolean>;
  walletProvider: ReturnType<typeof useHyperliquidAgent>['walletProvider'];
  infoClient: ReturnType<typeof useHyperliquidAgent>['infoClient'];
  transport: ReturnType<typeof useHyperliquidAgent>['transport'];
  getAgentClients: ReturnType<typeof useHyperliquidAgent>['getAgentClients'];
  ensureAgentApproved: ReturnType<typeof useHyperliquidAgent>['ensureAgentApproved'];
  refreshApprovalStatus: ReturnType<typeof useHyperliquidAgent>['refreshApprovalStatus'];
}

const ApprovalGateContext = createContext<ApprovalGateContextValue | undefined>(undefined);

export function ApprovalGateProvider({ children }: ApprovalGateProviderProps) {
  const agent = useHyperliquidAgent();
  const [isEnsuringApproval, setIsEnsuringApproval] = useState(false);

  const withAgentApproval = useCallback<ApprovalGateContextValue['withAgentApproval']>(
    async action => {
      if (!agent.walletProvider) {
        Alert.alert('Wallet not connected', 'Please connect your wallet to continue.');
        return false;
      }

      const executeAction = async (context: AgentClientContext) => {
        await Promise.resolve(action(context));
      };

      const initialContext = await agent.getAgentClients();

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
                setIsEnsuringApproval(true);
                try {
                  const approvedContext = await agent.ensureAgentApproved();

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
                } finally {
                  setIsEnsuringApproval(false);
                }
              })();
            },
          },
        ]);
      });
    },
    [agent],
  );

  const value = useMemo<ApprovalGateContextValue>(
    () => ({
      requiresAgentApproval: agent.requiresAgentApproval,
      isCheckingApproval: agent.isCheckingApproval,
      isEnsuringApproval,
      withAgentApproval,
      walletProvider: agent.walletProvider,
      infoClient: agent.infoClient,
      transport: agent.transport,
      getAgentClients: agent.getAgentClients,
      ensureAgentApproved: agent.ensureAgentApproved,
      refreshApprovalStatus: agent.refreshApprovalStatus,
    }),
    [agent, isEnsuringApproval, withAgentApproval],
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
