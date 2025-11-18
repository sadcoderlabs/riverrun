import { useWallet } from '@/app-internal';
import type { WalletInfo } from '@/contexts/wallet/ports/types';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { toast } from 'sonner-native';
import { Text, XStack, YStack } from 'tamagui';
import { Button, CustomHeader } from '../global';
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
        description: 'Successfully disconnected from Privy',
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
        description: 'Successfully disconnected from Reown',
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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Overlay */}
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Content Container */}
        <Pressable style={styles.contentContainer} onPress={e => e.stopPropagation()}>
          <YStack
            flex={1}
            backgroundColor="$background"
            borderTopLeftRadius="$6"
            borderTopRightRadius="$6"
            gap="$2"
          >
            {/* Handle */}
            <YStack
              opacity={0.5}
              backgroundColor="$gray9"
              height={3}
              width={32}
              alignSelf="center"
              marginTop="$2"
              marginBottom="$1"
              borderRadius="$12"
            />

            {/* Header */}
            <CustomHeader title="Wallets" showBackButton={false} />

            {/* Content */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {/* Reown Section */}
              <YStack gap="$2" paddingHorizontal="$4" marginBottom="$6">
                <Text fontSize={14} fontFamily="$interSemiBold" color="$color11" marginBottom="$1">
                  External Wallets
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
                      Disconnect External Wallets
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
                    onPress={handleConnectPrivy}
                    alignItems="center"
                  >
                    <XStack alignItems="center">
                      <Text color="$color1">Create or Connect via</Text>
                      <Image
                        source={require('../../assets/images/Privy-logo.png')}
                        style={{ width: 74, height: 16, marginLeft: 4 }}
                        resizeMode="contain"
                      />
                    </XStack>
                  </Button.Filled>
                )}
              </YStack>
            </ScrollView>
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  contentContainer: {
    height: '60%',
    width: '100%',
  },
});
