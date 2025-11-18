import { useWallet } from '@/app-internal';
import type { WalletInfo } from '@/contexts/wallet/ports/types';
import { useEffect, useState } from 'react';
import { Image, ScrollView } from 'react-native';
import { toast } from 'sonner-native';
import { Sheet, Text, XStack, YStack } from 'tamagui';
import { Button } from '../global';
import { WalletListItem } from './WalletListItem';

interface WalletSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export function WalletSelectorModal({ visible, onClose }: WalletSelectorModalProps) {
  const { wallet, connect, disconnect, setActive, listAvailable } = useWallet();
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);

  // Fetch available wallets
  useEffect(() => {
    listAvailable().then(setAvailableWallets);
  }, [listAvailable]);

  // Get wallet status for each type
  const privyWallet = availableWallets.find(w => w.source === 'privy');
  const reownWallet = availableWallets.find(w => w.source === 'reown');

  const handleSwitchWallet = async (source: 'privy' | 'reown') => {
    try {
      await setActive(source);
      onClose();
    } catch (error) {
      console.error('Error switching wallet:', error);
      toast.error('Switch Failed', {
        description: 'Failed to switch wallet',
      });
    }
  };

  const handleDisconnectPrivy = async () => {
    try {
      await disconnect('privy');
      toast.success('Wallet Disconnected', {
        description: 'Your Privy wallet has been disconnected',
      });
    } catch (error) {
      console.error('Error disconnecting Privy wallet:', error);
      toast.error('Disconnect Failed', {
        description: 'Failed to disconnect wallet',
      });
    }
  };

  const handleDisconnectReown = async () => {
    try {
      await disconnect('reown');
      toast.success('Wallet Disconnected', {
        description: 'Your external wallet has been disconnected',
      });
    } catch (error) {
      console.error('Error disconnecting Reown wallet:', error);
      toast.error('Disconnect Failed', {
        description: 'Failed to disconnect wallet',
      });
    }
  };

  const handleConnectPrivy = async () => {
    onClose();
    // Small delay to let modal close first
    setTimeout(async () => {
      try {
        await connect('privy');
      } catch (error) {
        console.error('Error connecting Privy wallet:', error);
        toast.error('Connection Failed', {
          description: 'Failed to connect Privy wallet',
        });
      }
    }, 300);
  };

  const handleConnectReown = () => {
    onClose();
    // Small delay to let modal close first
    setTimeout(async () => {
      try {
        await connect('reown');
      } catch (error) {
        console.error('Error connecting Reown wallet:', error);
        toast.error('Connection Failed', {
          description: 'Failed to connect Reown wallet',
        });
      }
    }, 300);
  };

  return (
    <Sheet
      modal
      native
      open={visible}
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
      snapPoints={[50]}
      position={0}
      dismissOnSnapToBottom
      dismissOnOverlayPress
      zIndex={100000}
    >
      <Sheet.Overlay
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="rgba(0,0,0,0.6)"
      />
      <Sheet.Frame
        padding="$2"
        backgroundColor="$background"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
      >
        <YStack paddingTop="$2" paddingBottom="$6">
          <YStack
            height={5}
            width={40}
            backgroundColor="$gray9"
            opacity={0.5}
            alignSelf="center"
            borderRadius="$12"
          />
        </YStack>
        <YStack flex={1} gap="$2" backgroundColor="$background">
          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {/* Reown Section */}
            <YStack gap="$2" paddingHorizontal="$4" marginBottom="$6">
              <Text fontSize={14} fontFamily="$interSemiBold" color="$color11" marginBottom="$1">
                External Wallet
              </Text>
              {reownWallet ? (
                <YStack gap="$2">
                  <WalletListItem
                    wallet={reownWallet}
                    isSelected={reownWallet.address === wallet?.address}
                    onPress={() => handleSwitchWallet('reown')}
                    isLastItem={true}
                  />
                  <Button.Gray
                    level="md"
                    height="$5"
                    color="$red10"
                    borderColor="$red8"
                    onPress={handleDisconnectReown}
                  >
                    Disconnect
                  </Button.Gray>
                </YStack>
              ) : (
                <Button.Filled level="md" height="$5" onPress={handleConnectReown}>
                  Connect
                </Button.Filled>
              )}
            </YStack>

            {/* Privy Section */}
            <YStack gap="$2" paddingHorizontal="$4">
              <Text fontSize={14} fontFamily="$interSemiBold" color="$color11" marginBottom="$4">
                Privy Wallet
              </Text>
              {privyWallet ? (
                <YStack gap="$2">
                  <WalletListItem
                    wallet={privyWallet}
                    isSelected={privyWallet.address === wallet?.address}
                    onPress={() => handleSwitchWallet('privy')}
                    isLastItem={true}
                  />
                  <Button.Gray
                    level="md"
                    height="$5"
                    color="$red10"
                    borderColor="$red8"
                    onPress={handleDisconnectPrivy}
                  >
                    Disconnect
                  </Button.Gray>
                </YStack>
              ) : (
                <Button.Filled
                  level="md"
                  height="$5"
                  backgroundColor="$color12"
                  onPress={handleConnectPrivy}
                  alignItems="center"
                >
                  <XStack alignItems="center">
                    <Text color="$color1">Create or connect via</Text>
                    <Image
                      source={require('../../assets/images/Privy-logo.png')}
                      style={{ width: 64, height: 14, marginLeft: 6 }}
                      resizeMode="contain"
                    />
                  </XStack>
                </Button.Filled>
              )}
            </YStack>
          </ScrollView>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
