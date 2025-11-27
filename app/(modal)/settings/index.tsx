import { useScreenTracking, useWallet } from '@/app-internal';
import { CustomHeader } from '@/app-internal/components/global';
import { ListItem } from '@/app-internal/components/global/ListItem';
import { ListSection } from '@/app-internal/components/global/ListSection';
import ExportWalletModal from '@/app-internal/components/settings/ExportWalletModal';
import { useCustomerSupport } from '@/app-internal/features/customerSupport';
import { useNotificationPreference } from '@/app-internal/features/notification';
import { useVersionInfo } from '@/app-internal/features/version/hooks/useVersionInfo';
import { useWalletOwnershipProof } from '@/app-internal/features/wallet/hooks/useWalletOwnershipProof';
import { features } from '@/config/environment';
import { ArrowUpRight, MessageCircle } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { PortalProvider, ScrollView, Spinner, Switch, View, YStack } from 'tamagui';

export default function Index() {
  useScreenTracking('Settings');
  const router = useRouter();
  const { wallet } = useWallet();
  const [showExportModal, setShowExportModal] = useState(false);
  const [isSigningProof, setIsSigningProof] = useState(false);
  const { displayVersion, checkForUpdate, isChecking, isDownloading } = useVersionInfo();
  const { openSupport } = useCustomerSupport();
  const { isEnabled: isNotificationEnabled, setEnabled: setNotificationEnabled } =
    useNotificationPreference();
  const { isSigned, requestSignature } = useWalletOwnershipProof();

  /**
   * Handle notification toggle.
   * - Disabling: just update preference (unregister handled by usePushNotifications effect)
   * - Enabling with signature: update preference (register handled by usePushNotifications effect)
   * - Enabling without signature: request signature first, then update preference
   */
  const handleNotificationToggle = useCallback(
    async (enabled: boolean) => {
      // Disabling - just update preference, usePushNotifications handles unregister
      if (!enabled) {
        setNotificationEnabled(false);
        return;
      }

      // Enabling with existing signature - usePushNotifications handles register
      if (isSigned) {
        setNotificationEnabled(true);
        return;
      }

      // Enabling without signature - request signature first
      setIsSigningProof(true);
      try {
        await requestSignature();
        setNotificationEnabled(true);
      } catch {
        Alert.alert('Signature Required', 'Please sign the message to enable push notifications.');
      } finally {
        setIsSigningProof(false);
      }
    },
    [isSigned, requestSignature, setNotificationEnabled],
  );

  return (
    <PortalProvider>
      <YStack flex={1} backgroundColor="$background">
        {/* Header */}
        <CustomHeader title="Settings" />

        {/* Content */}
        <ScrollView contentInsetAdjustmentBehavior="automatic" backgroundColor="$gray3">
          <YStack backgroundColor="$gray3">
            {/* Account Settings Section */}
            <YStack>
              <ListSection label="Account Settings">
                {wallet?.type === 'privy' && (
                  <ListItem
                    title="Private Key"
                    subTitle="Export your key"
                    showIosChevron={true}
                    onPress={() => setShowExportModal(true)}
                  />
                )}
                <ListItem
                  title="Agent Status"
                  subTitle="Manage trading agents"
                  showIosChevron={true}
                  onPress={() => router.push('/settings/agent-status')}
                />
                <ListItem
                  title="Referral Status"
                  subTitle="Manage referral code"
                  showIosChevron={true}
                  onPress={() => router.push('/settings/approval-status')}
                />
              </ListSection>
            </YStack>
            {/* Preferences Section */}
            <YStack>
              <ListSection label="Preferences">
                <ListItem
                  title="Push Notifications"
                  subTitle="Receive alerts for trades and updates"
                  iconAfter={
                    isSigningProof ? (
                      <View marginRight="$2">
                        <Spinner size="small" />
                      </View>
                    ) : (
                      <Switch
                        size="$3"
                        checked={isNotificationEnabled}
                        onCheckedChange={handleNotificationToggle}
                      >
                        <Switch.Thumb animation="quick" />
                      </Switch>
                    )
                  }
                />
              </ListSection>
            </YStack>
            {/* Socials Section */}
            <YStack>
              <ListSection label="Socials">
                <ListItem
                  title="X / Twitter"
                  subTitle="@perpprotocol"
                  iconAfter={
                    <View marginRight={'$1.5'}>
                      <ArrowUpRight size={18} color={'$color04'} fontWeight={'bold'} />
                    </View>
                  }
                  onPress={() => Linking.openURL('https://x.com/perpprotocol')}
                />
                <ListItem
                  title="Contact Support"
                  subTitle="Get help from our team"
                  iconAfter={
                    <View marginRight={'$1.5'}>
                      <MessageCircle size={18} color={'$color04'} fontWeight={'bold'} />
                    </View>
                  }
                  onPress={openSupport}
                />
              </ListSection>
            </YStack>

            {/* Version Section */}
            <YStack>
              <ListSection label="Version">
                <ListItem title="App Version" subTitle={displayVersion} />
                <ListItem
                  title="Check for Updates"
                  subTitle={
                    isChecking
                      ? 'Checking for updates...'
                      : isDownloading
                        ? 'Downloading update...'
                        : 'Check if a new version is available'
                  }
                  showIosChevron={true}
                  onPress={checkForUpdate}
                />
              </ListSection>
            </YStack>

            {/* Developer Tools Section - Only in Development */}
            {features.showDeveloperTools && (
              <YStack>
                <ListSection label="Developer Tools">
                  <ListItem
                    title="Builder Fee Status"
                    subTitle="Manage builder fee approval"
                    showIosChevron={true}
                    onPress={() => router.push('/settings/builder-fee-status')}
                  />
                </ListSection>
              </YStack>
            )}
          </YStack>
        </ScrollView>

        {/* Export Wallet Modal */}
        <ExportWalletModal open={showExportModal} onOpenChange={setShowExportModal} />
      </YStack>
    </PortalProvider>
  );
}
