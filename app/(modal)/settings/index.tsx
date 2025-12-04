import { useScreenTracking, useWallet, useWelcomeStore } from '@/app-internal';
import { CustomHeader } from '@/app-internal/components/global';
import { ListItem } from '@/app-internal/components/global/ListItem';
import { ListSection } from '@/app-internal/components/global/ListSection';
import ExportWalletModal from '@/app-internal/components/settings/ExportWalletModal';
import { useCustomerSupport } from '@/app-internal/features/customerSupport';
import { useVersionInfo } from '@/app-internal/features/version/hooks/useVersionInfo';
import { features } from '@/config/environment';
import { marketStore } from '@/contexts/market/adapters/marketStore';
import { ArrowUpRight, MessageCircle } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { PortalProvider, ScrollView, View, YStack } from 'tamagui';

export default function Index() {
  useScreenTracking('Settings');
  const router = useRouter();
  const { wallet } = useWallet();
  const [showExportModal, setShowExportModal] = useState(false);
  const { displayVersion, checkForUpdate, isChecking, isDownloading } = useVersionInfo();
  const { openSupport } = useCustomerSupport();

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
                    title="Export Private Key"
                    subTitle="Handle with care"
                    showIosChevron={true}
                    onPress={() => setShowExportModal(true)}
                  />
                )}
                <ListItem
                  title="Trading Agent"
                  subTitle="Manage session signers"
                  showIosChevron={true}
                  onPress={() => router.push('/settings/agent-status')}
                />
                <ListItem
                  title="Referral Status"
                  subTitle="Get trading fee discounts"
                  showIosChevron={true}
                  onPress={() => router.push('/settings/approval-status')}
                />
              </ListSection>
            </YStack>
            {/* Preferences Section */}
            <YStack>
              <ListSection label="Preferences">
                <ListItem
                  title="Notifications"
                  subTitle="Manage push notifications"
                  showIosChevron={true}
                  onPress={() => router.push('/settings/notifications')}
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
                  title="Support"
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
                  <ListItem
                    title="Clear Market Cache"
                    subTitle="Reset market data and reload"
                    onPress={() => {
                      marketStore.getState().clear();
                      Alert.alert(
                        'Cache Cleared',
                        'Market cache has been cleared. Please restart the app.',
                      );
                    }}
                  />
                  <ListItem
                    title="Reset Welcome Screens"
                    subTitle="Show welcome screens again"
                    onPress={() => {
                      useWelcomeStore.getState().reset();
                      Alert.alert(
                        'Welcome Screens Reset',
                        'Welcome screens will be shown again when you visit the Trade tab.',
                      );
                    }}
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
