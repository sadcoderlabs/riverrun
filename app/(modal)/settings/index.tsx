import { useWallet } from '@/app-internal';
import { CustomHeader } from '@/app-internal/components/global';
import AdaptiveSelect from '@/app-internal/components/global/AdaptiveSelect';
import { ListItem } from '@/app-internal/components/global/ListItem';
import { ListSection } from '@/app-internal/components/global/ListSection';
import ExportWalletModal from '@/app-internal/components/settings/ExportWalletModal';
import { type ThemePreference } from '@/app-internal/components/shared/theme/theme.store';
import { useThemePreference } from '@/app-internal/components/shared/theme/useThemePreference';
import { useVersion } from '@/app-internal/features/version/hooks/useVersion';
import { features } from '@/config/environment';
import { ArrowUpRight } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';
import { PortalProvider, ScrollView, View, YStack } from 'tamagui';

export default function Index() {
  const router = useRouter();
  const { preference, setPreference } = useThemePreference();
  const { wallet } = useWallet();
  const [showExportModal, setShowExportModal] = useState(false);
  const { displayVersion, checkForUpdate, isChecking, isDownloading } = useVersion();

  const getThemeDisplayName = (theme: ThemePreference) => {
    const themeMap: Record<ThemePreference, string> = {
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    };
    return themeMap[theme];
  };

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
                    title="Export Wallet"
                    subTitle="Export your wallet private key securely"
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
                <AdaptiveSelect
                  value={preference ?? 'dark'}
                  onValueChange={value => setPreference(value as ThemePreference)}
                  title="Theme"
                >
                  <AdaptiveSelect.Trigger>
                    <ListItem title="Theme" subTitle={getThemeDisplayName(preference ?? 'dark')} />
                  </AdaptiveSelect.Trigger>
                  <AdaptiveSelect.Item value="light" index={0}>
                    Light
                  </AdaptiveSelect.Item>
                  <AdaptiveSelect.Item value="dark" index={1}>
                    Dark
                  </AdaptiveSelect.Item>
                  <AdaptiveSelect.Item value="system" index={2}>
                    System
                  </AdaptiveSelect.Item>
                </AdaptiveSelect>
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
