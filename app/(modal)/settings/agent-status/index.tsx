import { Button } from '@/components/global/Button';
import { DEFAULT_AGENT_NAME } from '@/core/contexts/agent/constants';
import { useAgentContext } from '@/core/composition';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl } from 'react-native';
import { PortalProvider, ScrollView, Spinner, Text, View, XStack, YStack } from 'tamagui';

/**
 * Helper function to shorten address for display
 */
function shortenAddress(address: string | undefined): string {
  if (!address) return 'N/A';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function AgentStatus() {
  const router = useRouter();

  // Agent context
  const {
    agentAddress,
    isApproved: isAgentApproved,
    isLoading: isAgentLoading,
    allAgents,
    checkStatus: checkAgentStatus,
    approve: approveAgent,
    revoke: revokeAgent,
    getAllAgents,
  } = useAgentContext();

  // Loading and refresh states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  /**
   * Load all agent statuses
   */
  const loadAllStatuses = useCallback(async () => {
    await Promise.all([checkAgentStatus(), getAllAgents()]);
  }, [checkAgentStatus, getAllAgents]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAllStatuses();
    setIsRefreshing(false);
  }, [loadAllStatuses]);

  /**
   * Initial load
   */
  useEffect(() => {
    const init = async () => {
      await loadAllStatuses();
      setIsInitialLoading(false);
    };
    void init();
  }, [loadAllStatuses]);

  /**
   * Handle Riverrun Agent approve
   */
  const handleApproveRiverrunAgent = useCallback(async () => {
    // Check if we have reached the limit of 3 non-Riverrun agents
    const nonRiverrunAgents = allAgents.filter(
      agent => agent.name && agent.name !== DEFAULT_AGENT_NAME,
    );

    // If Riverrun Agent doesn't exist and we have 3 other agents
    if (!isAgentApproved && nonRiverrunAgents.length >= 3) {
      Alert.alert(
        'Agent Limit Reached',
        `You have 3 other named agents. Please revoke one of them first before approving ${DEFAULT_AGENT_NAME}.`,
      );
      return;
    }

    // Show confirmation dialog then approve
    Alert.alert(
      `Approve ${DEFAULT_AGENT_NAME}`,
      'This will generate a new agent wallet to place orders on your behalf. You will be redirected to your wallet app to sign the approval.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const success = await approveAgent();
              if (success) {
                Alert.alert('Success', `${DEFAULT_AGENT_NAME} approved successfully`);
                await checkAgentStatus();
                await getAllAgents();
              }
            } catch (error) {
              console.error('Failed to approve agent:', error);
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to approve agent',
              );
            }
          },
        },
      ],
    );
  }, [allAgents, isAgentApproved, approveAgent, checkAgentStatus, getAllAgents]);

  /**
   * Handle revoke agent (Riverrun Agent or other named agents)
   */
  const handleRevokeAgent = useCallback(
    async (agentName: string) => {
      const isRiverrunAgent = agentName === DEFAULT_AGENT_NAME;

      Alert.alert(
        isRiverrunAgent ? `Revoke ${DEFAULT_AGENT_NAME}` : 'Revoke Agent',
        isRiverrunAgent
          ? `This will revoke the ${DEFAULT_AGENT_NAME} from the blockchain and clear local storage. You will need to approve a new agent for future trading.`
          : `This will revoke "${agentName}" from the blockchain. The agent will no longer be able to trade on your behalf. Continue?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Revoke',
            style: 'destructive',
            onPress: async () => {
              try {
                const success = await revokeAgent(agentName);
                if (success) {
                  Alert.alert(
                    'Success',
                    isRiverrunAgent
                      ? `${DEFAULT_AGENT_NAME} revoked successfully`
                      : `"${agentName}" has been revoked successfully.`,
                  );
                  await checkAgentStatus();
                  await getAllAgents();
                }
              } catch (error) {
                console.error('Failed to revoke agent:', error);
                Alert.alert(
                  'Error',
                  error instanceof Error ? error.message : 'Failed to revoke agent',
                );
              }
            },
          },
        ],
      );
    },
    [revokeAgent, checkAgentStatus, getAllAgents],
  );

  // Get other named agents (exclude Riverrun Agent)
  const otherNamedAgents = allAgents.filter(
    agent => agent.name && agent.name !== DEFAULT_AGENT_NAME,
  );

  return (
    <PortalProvider>
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <XStack
          alignItems="center"
          gap="$3"
          paddingHorizontal="$4"
          paddingVertical="$3"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <ArrowLeft size={24} color="$color" />
          </Pressable>
          <Text fontFamily="$interSemiBold" fontSize="$6">
            Agent Status
          </Text>
          {isAgentLoading && (
            <View marginLeft="auto">
              <Spinner size="small" />
            </View>
          )}
        </XStack>

        {/* Content */}
        <ScrollView
          flex={1}
          contentInsetAdjustmentBehavior="automatic"
          backgroundColor="$gray3"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        >
          {isInitialLoading ? (
            <View flex={1} alignItems="center" justifyContent="center" paddingVertical="$10">
              <Spinner size="large" />
              <Text marginTop="$4" color="$color04">
                Loading agent status...
              </Text>
            </View>
          ) : (
            <YStack backgroundColor="$gray3" minHeight="100%">
              {/* Agent Section */}
              <YStack gap="$2" mx="$4" my="$4">
                <Text
                  fontWeight="500"
                  color="$color06"
                  ml="$4"
                  fontSize="$3"
                  textTransform="uppercase"
                >
                  Named Agents ({allAgents.filter(a => a.name).length}/3)
                </Text>
                <View overflow="hidden" borderRadius="$9" backgroundColor="$background">
                  {/* Riverrun Agent - always shown */}
                  <XStack
                    paddingHorizontal="$4"
                    paddingVertical="$3"
                    alignItems="center"
                    justifyContent="space-between"
                    borderBottomWidth={otherNamedAgents.length > 0 ? 1 : 0}
                    borderBottomColor="$color10"
                    backgroundColor="$accent2"
                  >
                    <YStack flex={1}>
                      <XStack alignItems="center" gap="$2">
                        <Text fontFamily="$interMedium" fontSize="$4" color="$accent11">
                          {DEFAULT_AGENT_NAME}
                        </Text>
                        <View
                          backgroundColor="$accent9"
                          paddingHorizontal="$2"
                          paddingVertical="$0.5"
                          borderRadius="$2"
                        >
                          <Text fontSize="$1" fontFamily="$interMedium" color="$accent1">
                            PRIMARY
                          </Text>
                        </View>
                      </XStack>
                      <Text
                        fontFamily="$interRegular"
                        fontSize="$3"
                        color="$color04"
                        marginTop="$1"
                      >
                        {isAgentApproved ? shortenAddress(agentAddress) : 'Not Approved'}
                      </Text>
                    </YStack>
                    <XStack flexShrink={0}>
                      {!isAgentApproved ? (
                        <Button.Tinted
                          level="sm"
                          onPress={handleApproveRiverrunAgent}
                          disabled={isAgentLoading}
                        >
                          Approve
                        </Button.Tinted>
                      ) : (
                        <Button.Gray
                          level="sm"
                          onPress={() => handleRevokeAgent(DEFAULT_AGENT_NAME)}
                          disabled={isAgentLoading}
                          backgroundColor="$red9"
                          color="$red1"
                          pressStyle={{ backgroundColor: '$red10' }}
                        >
                          Revoke
                        </Button.Gray>
                      )}
                    </XStack>
                  </XStack>

                  {/* Other Named Agents */}
                  {otherNamedAgents.map((agent, index) => (
                    <XStack
                      key={agent.address}
                      paddingHorizontal="$4"
                      paddingVertical="$3"
                      alignItems="center"
                      justifyContent="space-between"
                      borderBottomWidth={index < otherNamedAgents.length - 1 ? 1 : 0}
                      borderBottomColor="$color10"
                    >
                      <YStack flex={1}>
                        <Text fontFamily="$interMedium" fontSize="$4" color="$color">
                          {agent.name || 'Unknown'}
                        </Text>
                        <Text
                          fontFamily="$interRegular"
                          fontSize="$3"
                          color="$color04"
                          marginTop="$1"
                        >
                          {shortenAddress(agent.address)}
                        </Text>
                      </YStack>
                      <XStack flexShrink={0}>
                        <Button.Gray
                          level="sm"
                          onPress={() => handleRevokeAgent(agent.name || '')}
                          disabled={isAgentLoading}
                          backgroundColor="$red9"
                          color="$red1"
                          pressStyle={{ backgroundColor: '$red10' }}
                        >
                          Revoke
                        </Button.Gray>
                      </XStack>
                    </XStack>
                  ))}
                </View>
              </YStack>
            </YStack>
          )}
        </ScrollView>
      </YStack>
    </PortalProvider>
  );
}
