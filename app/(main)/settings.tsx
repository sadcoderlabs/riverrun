import { ListButton, ListItem } from '@/components/global/list-item';
import { ListSection } from '@/components/global/list-section';
import { useThemePreference } from '@/hooks/useThemePreference';
import { clearAgentSigner } from '@/lib/hyperliquid/agent';
import { useAppKit, useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { ArrowUpRight } from '@tamagui/lucide-icons';
import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { PortalProvider, ScrollView, View, YStack } from 'tamagui';

type RevokeStatus = {
  type: 'success' | 'error';
  message: string;
};

export default function Index() {
  const { open } = useAppKit();
  const { address } = useAppKitAccount();
  const [revoking, setRevoking] = useState(false);
  const [status, setStatus] = useState<RevokeStatus | null>(null);
  const { preference } = useThemePreference();

  const displayAddress = '0x123456789';

  const performRevoke = useCallback(async () => {
    if (!address) {
      return;
    }

    setRevoking(true);
    setStatus(null);

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
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <YStack style={{ backgroundColor: '$gray3' }}>
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
            <ListSection label="Preferences">
              <Link href="/(main)/theme-options" asChild>
                <ListItem
                  title="Theme"
                  subTitle={
                    preference ? preference.charAt(0).toUpperCase() + preference.slice(1) : 'System'
                  }
                  showIosChevron={true}
                />
              </Link>
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
          {/* Logout Button */}
          <ListSection>
            <ListButton
              justifyContent="center"
              onPress={() => {
                open();
              }}
            >
              Disconnect Wallet
            </ListButton>
          </ListSection>
        </YStack>
      </ScrollView>
    </PortalProvider>
  );
}
