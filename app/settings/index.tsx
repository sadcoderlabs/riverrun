import { ListButton, ListItem } from '@/components/global/list-item';
import { ListSection } from '@/components/global/list-section';
import { useThemePreference } from '@/lib/riverrun/hooks';
import { type ThemePreference } from '@/lib/riverrun/store/theme.store';
import { ArrowLeft, ArrowUpRight } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { PortalProvider, ScrollView, Text, View, XStack, YStack } from 'tamagui';

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preference, setPreference } = useThemePreference();

  const themeOptions: { name: string; value: ThemePreference }[] = [
    { name: 'Light', value: 'light' },
    { name: 'Dark', value: 'dark' },
    { name: 'System', value: 'system' },
  ];

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
            {/* Theme Section */}
            <YStack>
              <ListSection label="Theme">
                {themeOptions.map(theme => (
                  <ListItem
                    key={theme.value}
                    title={theme.name}
                    isChecked={preference === theme.value}
                    onPress={() => setPreference(theme.value)}
                  />
                ))}
              </ListSection>
            </YStack>
            {/* Preferences Section */}
            <YStack>
              <ListSection label="Preferences">
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
            {/* Test Toast Section */}
            <ListSection>
              <ListButton
                justifyContent="center"
                onPress={() => {
                  toast.success('success', {
                    description: 'This is a test toast message',
                  });
                  toast.error('error', {
                    description: 'This is a test toast message',
                  });
                  toast.warning('warning', {
                    description: 'This is a test toast message',
                  });
                }}
              >
                Toast
              </ListButton>
            </ListSection>
          </YStack>
        </ScrollView>
      </YStack>
    </PortalProvider>
  );
}
