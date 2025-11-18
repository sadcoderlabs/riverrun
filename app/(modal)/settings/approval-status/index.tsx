import { useReferral, useReferralHintsStore } from '@/app-internal';
import { CustomHeader } from '@/app-internal/components/global';
import { ListButton, ListItem } from '@/app-internal/components/global/ListItem';
import { ListSection } from '@/app-internal/components/global/ListSection';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl } from 'react-native';
import { PortalProvider, ScrollView, Spinner, Text, View, YStack } from 'tamagui';

/**
 * Helper function to shorten address for display
 */
function shortenAddress(address: string | undefined): string {
  if (!address) return 'N/A';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ApprovalStatus() {
  // Referral state and operations
  const {
    referralInfo,
    hasReferrer,
    loadStatus,
    setReferrer,
    isLoading: isReferralLoading,
  } = useReferral();

  // Referral hints store
  const { dontHintReferral, setDontHintReferral } = useReferralHintsStore();

  // Loading and refresh states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadStatus();
    setIsRefreshing(false);
  }, [loadStatus]);

  /**
   * Initial load
   */
  useEffect(() => {
    const init = async () => {
      await loadStatus();
      setIsInitialLoading(false);
    };
    void init();
  }, [loadStatus]);

  /**
   * Handle set referrer
   */
  const handleSetReferrer = useCallback(async () => {
    const success = await setReferrer();
    if (success) {
      await loadStatus();
    }
  }, [setReferrer, loadStatus]);

  return (
    <PortalProvider>
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <CustomHeader
          title="Referral Status"
          style={{
            position: 'relative',
          }}
        />
        {isReferralLoading && (
          <View position="absolute" right={16} top={16}>
            <Spinner size="small" />
          </View>
        )}

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
                Loading referral status...
              </Text>
            </View>
          ) : (
            <YStack backgroundColor="$gray3">
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
                      {isReferralLoading ? 'Setting...' : 'Get 4% Fee Discount'}
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
