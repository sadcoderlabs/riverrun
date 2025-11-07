import AdaptiveSelect from '@/components/global/AdaptiveSelect';
import { ListItem } from '@/components/global/ListItem';
import { ListSection } from '@/components/global/ListSection';
import { useThemePreference } from '@/lib/riverrun/hooks';
import { useActiveWallet } from '@/lib/riverrun/wallet';
import { type ThemePreference } from '@/lib/riverrun/store/theme.store';
import { ArrowLeft, ArrowUpRight } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PortalProvider, ScrollView, Text, View, XStack, YStack } from 'tamagui';
import { useState } from 'react';
import ExportWalletModal from '@/components/settings/ExportWalletModal';

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preference, setPreference } = useThemePreference();
  const { wallet } = useActiveWallet();
  const [showExportModal, setShowExportModal] = useState(false);

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
            Settings
          </Text>
        </XStack>

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
                  title="Builder Fee Status"
                  subTitle="Manage builder fee approval"
                  showIosChevron={true}
                  onPress={() => router.push('/settings/builder-fee-status')}
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
                <ListItem
                  title="Allow Notifications"
                  subTitle="Permission Unset"
                  showIosChevron={true}
                />
              </ListSection>
            </YStack>
            {/* Support Section */}
            <YStack>
              <ListSection label="Support">
                <ListItem
                  title="FAQ"
                  iconAfter={
                    <View marginRight={'$1.5'}>
                      <ArrowUpRight size={18} color={'$color04'} />
                    </View>
                  }
                />
                <ListItem
                  title="Documents"
                  iconAfter={
                    <View marginRight={'$1.5'}>
                      <ArrowUpRight size={18} color={'$color04'} />
                    </View>
                  }
                />
              </ListSection>
            </YStack>
            {/* Socials Section */}
            <YStack>
              <ListSection label="Socials">
                <ListItem
                  title="X / Twitter"
                  subTitle="@riverrun"
                  iconAfter={
                    <View marginRight={'$1.5'}>
                      <ArrowUpRight size={18} color={'$color04'} fontWeight={'bold'} />
                    </View>
                  }
                />
              </ListSection>
            </YStack>
          </YStack>
        </ScrollView>

        {/* Export Wallet Modal */}
        <ExportWalletModal open={showExportModal} onOpenChange={setShowExportModal} />
      </YStack>
    </PortalProvider>
  );
}
