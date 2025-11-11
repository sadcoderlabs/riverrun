import { useWalletComposition } from '@/core/composition';
import { useActiveWallet } from '@/core/composition/hooks/useActiveWallet';
import { LogOut } from '@tamagui/lucide-icons';
import { Modal, Pressable, StyleSheet, ScrollView } from 'react-native';
import { toast } from 'sonner-native';
import { Button, Text, YStack } from 'tamagui';
import { WalletListItem } from './WalletListItem';
import { useState, useEffect } from 'react';
import type { WalletInfo } from '@/core/contexts/wallet/ports/types';

interface WalletSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export function WalletSelectorModal({ visible, onClose }: WalletSelectorModalProps) {
  const { walletService } = useWalletComposition();
  const { selectedSource } = useActiveWallet();
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);

  // Fetch available wallets
  useEffect(() => {
    walletService.listAvailable().then(setAvailableWallets);
  }, [walletService]);

  // Get wallet status for each type
  const privyWallet = availableWallets.find(w => w.source === 'privy');
  const reownWallet = availableWallets.find(w => w.source === 'reown');

  const handleSwitchWallet = async (source: 'privy' | 'reown') => {
    try {
      await walletService.setActive(source);
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
      await walletService.disconnect('privy');
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
      await walletService.disconnect('reown');
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
        await walletService.connect('privy');
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
        await walletService.connect('reown');
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
            <YStack paddingHorizontal="$4" paddingTop="$2" paddingBottom="$3">
              <Text fontSize={20} fontFamily="$interSemiBold" color="$color12">
                Wallets
              </Text>
            </YStack>

            {/* Content */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {/* Privy Section */}
              <YStack gap="$2" paddingHorizontal="$4" marginBottom="$4">
                <Text fontSize={16} fontFamily="$interSemiBold" color="$color11" marginBottom="$1">
                  Privy Wallet
                </Text>
                {privyWallet ? (
                  <YStack gap="$2">
                    <WalletListItem
                      wallet={privyWallet}
                      isSelected={privyWallet.source === selectedSource}
                      onPress={() => handleSwitchWallet('privy')}
                    />
                    <Button
                      size="$3"
                      backgroundColor="$red4"
                      color="$red10"
                      borderWidth={1}
                      borderColor="$red8"
                      pressStyle={{ opacity: 0.8 }}
                      onPress={handleDisconnectPrivy}
                      icon={<LogOut size={16} color="$red10" />}
                    >
                      Disconnect from Privy
                    </Button>
                  </YStack>
                ) : (
                  <Button
                    size="$3"
                    backgroundColor="$accent9"
                    color="white"
                    pressStyle={{ opacity: 0.8 }}
                    onPress={handleConnectPrivy}
                  >
                    Connect from Privy
                  </Button>
                )}
              </YStack>

              {/* Reown Section */}
              <YStack gap="$2" paddingHorizontal="$4">
                <Text fontSize={16} fontFamily="$interSemiBold" color="$color11" marginBottom="$1">
                  External Wallet
                </Text>
                {reownWallet ? (
                  <YStack gap="$2">
                    <WalletListItem
                      wallet={reownWallet}
                      isSelected={reownWallet.source === selectedSource}
                      onPress={() => handleSwitchWallet('reown')}
                    />
                    <Button
                      size="$3"
                      backgroundColor="$red4"
                      color="$red10"
                      borderWidth={1}
                      borderColor="$red8"
                      pressStyle={{ opacity: 0.8 }}
                      onPress={handleDisconnectReown}
                      icon={<LogOut size={16} color="$red10" />}
                    >
                      Disconnect from Reown
                    </Button>
                  </YStack>
                ) : (
                  <Button
                    size="$3"
                    backgroundColor="$accent9"
                    color="white"
                    pressStyle={{ opacity: 0.8 }}
                    onPress={handleConnectReown}
                  >
                    Connect from Reown
                  </Button>
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
