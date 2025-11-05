import { ListButton, ListItem } from '@/components/global/list-item';
import { ListSection } from '@/components/global/list-section';
import { useThemePreference, useActiveWallet } from '@/lib/riverrun/hooks';
import { clearAgentSigner } from '@/lib/hyperliquid/agent';
import { type ThemePreference } from '@/lib/riverrun/store/theme.store';
import { ArrowUpRight } from '@tamagui/lucide-icons';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { toast } from 'sonner-native';
import { PortalProvider, ScrollView, View, YStack } from 'tamagui';

type RevokeStatus = {
  type: 'success' | 'error';
  message: string;
};

export default function Index() {
  const { address } = useActiveWallet();
  const [revoking, setRevoking] = useState(false);
  const [status, setStatus] = useState<RevokeStatus | undefined>(undefined);
  const { preference, setPreference } = useThemePreference();

  const themeOptions: { name: string; value: ThemePreference }[] = [
    { name: 'Light', value: 'light' },
    { name: 'Dark', value: 'dark' },
    { name: 'System', value: 'system' },
  ];

  const displayAddress = '0x123456789';

  const performRevoke = useCallback(async () => {
    if (!address) {
      return;
    }

    setRevoking(true);
    setStatus(undefined);

    try {
      await clearAgentSigner(address);
      setStatus({
        type: 'success',
        message: 'Agent revoked locally. You will be asked to approve again next time.',
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Failed to revoke agent. Please try again.',
      });
    } finally {
      setRevoking(false);
    }
  }, [address]);

  const handleRevokePress = useCallback(() => {
    if (!address) {
      setStatus({
        type: 'error',
        message: 'Connect your wallet before revoking the agent.',
      });
      return;
    }

    Alert.alert(
      'Revoke agent?',
      'This removes the stored agent key on this device. You will need to approve again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            void performRevoke();
          },
        },
      ],
    );
  }, [address, performRevoke]);

  return (
    <PortalProvider>
      <ScrollView contentInsetAdjustmentBehavior="automatic" backgroundColor="$gray3">
        <YStack backgroundColor="$gray3">
          {/* Account Section */}
          <YStack>
            <ListSection label="Account">
              <ListItem title={displayAddress} />
              <ListItem
                title="Status"
                subTitle={status?.type === 'success' ? status.message : 'Unknown'}
              />
            </ListSection>
          </YStack>
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
          {/* Revoke Agent */}
          <ListSection>
            <ListButton
              justifyContent="center"
              onPress={handleRevokePress}
              disabled={!address || revoking}
            >
              {revoking ? 'Revoking...' : 'Revoke Agent'}
            </ListButton>
          </ListSection>
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
    </PortalProvider>
  );
}
