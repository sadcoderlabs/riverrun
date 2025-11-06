import { ListButton, ListItem } from '@/components/global/list-item';
import { ListSection } from '@/components/global/list-section';
import { BUILDER_CONFIG } from '@/lib/hyperliquid/config/builder';
import { useBuilderFeeApproval } from '@/lib/hyperliquid/hooks/useBuilderFeeApproval';
import { useReferralStatus } from '@/lib/hyperliquid/hooks/useReferralStatus';
import { useApprovalHintsStore } from '@/lib/riverrun/store/approval-hints.store';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl } from 'react-native';
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
    await Promise.all([checkBuilderFeeStatus(), checkReferralStatus()]);
  }, [checkBuilderFeeStatus, checkReferralStatus]);

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

  const isLoading = isBuilderFeeLoading || isReferralLoading;

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
