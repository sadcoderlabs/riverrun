import { ListButton, ListItem } from '@/app-internal/components/global/ListItem';
import { ListSection } from '@/app-internal/components/global/ListSection';
import { BUILDER_CONFIG } from '@/contexts/builderFee/config';
import { useBuilderFee } from '@/app-internal';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl } from 'react-native';
import { PortalProvider, ScrollView, Spinner, Text, View, XStack, YStack } from 'tamagui';

export default function BuilderFeeStatus() {
  const router = useRouter();

  // Builder fee state and operations
  const {
    maxApprovedFee,
    isApproved: isBuilderFeeApproved,
    isLoading: isBuilderFeeLoading,
    loadBuilderFeeStatus,
    approveBuilderFee,
    revokeBuilderFee,
  } = useBuilderFee();

  // Loading and refresh states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadBuilderFeeStatus();
    setIsRefreshing(false);
  }, [loadBuilderFeeStatus]);

  /**
   * Initial load
   */
  useEffect(() => {
    const init = async () => {
      await loadBuilderFeeStatus();
      setIsInitialLoading(false);
    };
    void init();
  }, [loadBuilderFeeStatus]);

  /**
   * Handle builder fee approve
   */
  const handleApproveBuilderFee = useCallback(async () => {
    const success = await approveBuilderFee();
    if (success) {
      await loadBuilderFeeStatus();
    }
  }, [approveBuilderFee, loadBuilderFeeStatus]);

  /**
   * Handle builder fee revoke
   */
  const handleRevokeBuilderFee = useCallback(async () => {
    const success = await revokeBuilderFee();
    if (success) {
      await loadBuilderFeeStatus();
    }
  }, [revokeBuilderFee, loadBuilderFeeStatus]);

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
            Builder Fee Status
          </Text>
          {isBuilderFeeLoading && (
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
                Loading builder fee status...
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
            </YStack>
          )}
        </ScrollView>
      </YStack>
    </PortalProvider>
  );
}
