import { Button } from '@/components/global/button';
import { ListButton, ListItem } from '@/components/global/list-item';
import { ListSection } from '@/components/global/list-section';
import { BUILDER_CONFIG } from '@/lib/hyperliquid/config/builder';
import { useAgentApproval } from '@/lib/hyperliquid/hooks/useAgentApproval';
import { useBuilderFeeApproval } from '@/lib/hyperliquid/hooks/useBuilderFeeApproval';
import { useReferralStatus } from '@/lib/hyperliquid/hooks/useReferralStatus';
import { useApprovalHintsStore } from '@/lib/riverrun/store/approval-hints.store';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PortalProvider, ScrollView, Spinner, Text, View, XStack, YStack } from 'tamagui';

/**
 * Helper function to shorten address for display
 */
function shortenAddress(address: string | undefined): string {
  if (!address) return 'N/A';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ApprovalStatus() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Agent approval
  const {
    agentAddress,
    isApproved: isAgentApproved,
    isLoading: isAgentLoading,
    allAgents,
    checkStatus: checkAgentStatus,
    revoke: revokeAgent,
    getAllAgents,
    revokeNamedAgent,
    ensureRiverrunAgent,
    renewRiverrunAgent,
  } = useAgentApproval();

  // Builder fee approval
  const {
    maxApprovedFee,
    isApproved: isBuilderFeeApproved,
    isLoading: isBuilderFeeLoading,
    checkStatus: checkBuilderFeeStatus,
    approve: approveBuilderFee,
    revoke: revokeBuilderFee,
  } = useBuilderFeeApproval();

  // Referral status
  const {
    referralInfo,
    hasReferrer,
    isLoading: isReferralLoading,
    checkStatus: checkReferralStatus,
    setReferrer,
  } = useReferralStatus();

  // Approval hints store
  const { dontHintReferral, setDontHintReferral } = useApprovalHintsStore();

  // Loading and refresh states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  /**
   * Load all approval statuses
   */
  const loadAllStatuses = useCallback(async () => {
    await Promise.all([
      checkAgentStatus(),
      getAllAgents(),
      checkBuilderFeeStatus(),
      checkReferralStatus(),
    ]);
  }, [checkAgentStatus, getAllAgents, checkBuilderFeeStatus, checkReferralStatus]);

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
   * Always generates a new agent (clears old one if exists)
   */
  const handleApproveRiverrunAgent = useCallback(async () => {
    // Check if we have reached the limit of 3 non-Riverrun agents
    const nonRiverrunAgents = allAgents.filter(
      agent => agent.name && agent.name !== 'Riverrun Agent',
    );

    // If Riverrun Agent doesn't exist and we have 3 other agents
    if (!isAgentApproved && nonRiverrunAgents.length >= 3) {
      Alert.alert(
        'Agent Limit Reached',
        'You have 3 other named agents. Please revoke one of them first before approving Riverrun Agent.',
      );
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      'Approve Riverrun Agent',
      'This will generate a new agent wallet to place orders on your behalf. You will be redirected to your wallet app to sign the approval.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: async () => {
            // Use renewRiverrunAgent which handles: clear old -> generate new -> approve
            const success = await renewRiverrunAgent();
            if (success) {
              await checkAgentStatus();
              await getAllAgents();
            }
          },
        },
      ],
    );
  }, [allAgents, isAgentApproved, renewRiverrunAgent, checkAgentStatus, getAllAgents]);

  /**
   * Handle Riverrun Agent revoke
   */
  const handleRevokeRiverrunAgent = useCallback(async () => {
    Alert.alert(
      'Revoke Riverrun Agent',
      'This will revoke the Riverrun Agent from the blockchain and clear local storage. You will need to approve a new agent for future trading.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            const success = await revokeAgent();
            if (success) {
              await checkAgentStatus();
              await getAllAgents();
            }
          },
        },
      ],
    );
  }, [revokeAgent, checkAgentStatus, getAllAgents]);

  /**
   * Handle revoke other named agent
   */
  const handleRevokeOtherAgent = useCallback(
    async (agentName: string) => {
      const success = await revokeNamedAgent(agentName);
      if (success) {
        await getAllAgents();
      }
    },
    [revokeNamedAgent, getAllAgents],
  );

  /**
   * Handle builder fee approve
   */
  const handleApproveBuilderFee = useCallback(async () => {
    const success = await approveBuilderFee();
    if (success) {
      await checkBuilderFeeStatus();
    }
  }, [approveBuilderFee, checkBuilderFeeStatus]);

  /**
   * Handle builder fee revoke
   */
  const handleRevokeBuilderFee = useCallback(async () => {
    const success = await revokeBuilderFee();
    if (success) {
      await checkBuilderFeeStatus();
    }
  }, [revokeBuilderFee, checkBuilderFeeStatus]);

  /**
   * Handle set referrer
   */
  const handleSetReferrer = useCallback(async () => {
    const success = await setReferrer();
    if (success) {
      await checkReferralStatus();
    }
  }, [setReferrer, checkReferralStatus]);

  const isLoading = isAgentLoading || isBuilderFeeLoading || isReferralLoading;

  // Get other named agents (exclude Riverrun Agent)
  const otherNamedAgents = allAgents.filter(agent => agent.name && agent.name !== 'Riverrun Agent');

  return (
    <PortalProvider>
      <YStack
        flex={1}
        backgroundColor="$background"
        paddingTop={insets.top}
        paddingBottom={insets.bottom}
      >
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
            Approval Status
          </Text>
          {isLoading && (
            <View marginLeft="auto">
              <Spinner size="small" />
            </View>
          )}
        </XStack>

        {/* Content */}
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          backgroundColor="$gray3"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        >
          {isInitialLoading ? (
            <View flex={1} alignItems="center" justifyContent="center" paddingVertical="$10">
              <Spinner size="large" />
              <Text marginTop="$4" color="$color04">
                Loading approval statuses...
              </Text>
            </View>
          ) : (
            <YStack backgroundColor="$gray3">
              {/* Agent Approval Section */}
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
                          Riverrun Agent
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
                          onPress={handleRevokeRiverrunAgent}
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
                          onPress={() => handleRevokeOtherAgent(agent.name || '')}
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

              {/* Builder Fee Approval Section */}
              <ListSection label="Builder Fee Approval">
                <ListItem
                  title="Status"
                  text={isBuilderFeeApproved ? '✓ Approved' : 'Not Approved'}
                  textAlign="right"
                />
                {maxApprovedFee > 0 && (
                  <ListItem
                    title="Max Approved"
                    text={`${(maxApprovedFee / 1000).toFixed(3)}%`}
                    textAlign="right"
                  />
                )}
                <ListItem
                  title="Current Fee"
                  text={`${(BUILDER_CONFIG.feeRate / 1000).toFixed(3)}%`}
                  textAlign="right"
                />
                <ListButton
                  justifyContent="center"
                  onPress={handleApproveBuilderFee}
                  disabled={isBuilderFeeLoading}
                >
                  {isBuilderFeeLoading ? 'Approving...' : 'Approve Builder Fee'}
                </ListButton>
                <ListButton
                  justifyContent="center"
                  onPress={handleRevokeBuilderFee}
                  disabled={isBuilderFeeLoading}
                >
                  {isBuilderFeeLoading ? 'Revoking...' : 'Revoke Builder Fee'}
                </ListButton>
              </ListSection>

              {/* Referral Section */}
              <ListSection label="Referral">
                <ListItem
                  title="Referred By"
                  text={referralInfo.code || 'None'}
                  textAlign="right"
                />
                {hasReferrer && referralInfo.referrer && (
                  <ListItem
                    title="Referrer Address"
                    subTitle={shortenAddress(referralInfo.referrer)}
                  />
                )}
                {!hasReferrer && (
                  <>
                    <ListButton
                      justifyContent="center"
                      onPress={handleSetReferrer}
                      disabled={isReferralLoading}
                    >
                      {isReferralLoading ? 'Setting...' : 'Set Referral Code'}
                    </ListButton>
                    <ListItem
                      title="Don't hint me when trading"
                      isChecked={dontHintReferral}
                      onPress={() => setDontHintReferral(!dontHintReferral)}
                    />
                  </>
                )}
              </ListSection>
            </YStack>
          )}
        </ScrollView>
      </YStack>
    </PortalProvider>
  );
}
