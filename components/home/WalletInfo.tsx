import { useActiveWallet } from '@/lib/riverrun/wallet';
import { Copy, Settings, Wallet } from '@tamagui/lucide-icons';
import * as Clipboard from 'expo-clipboard';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import Jazzicon from 'react-native-jazzicon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { styled, Text, useTheme, XStack, YStack } from 'tamagui';
import { WalletSelectorModal } from './WalletSelectorModal';

const Avatar = styled(XStack, {
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: '$color6',
  alignItems: 'center',
  justifyContent: 'center',
});

const IconButton = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'center',
  padding: '$2',
  pressStyle: { opacity: 0.7 },
});

function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function WalletInfo() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { wallet } = useActiveWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use the unified wallet address and name from useWallet
  const walletAddress = wallet?.address || '0xunknown_wallet';

  const handleCopyAddress = async () => {
    if (wallet?.address) {
      await Clipboard.setStringAsync(wallet.address);
      toast.success('Address Copied', {
        description: 'Wallet address copied to clipboard',
      });
    }
  };

  return (
    <>
      <XStack
        backgroundColor="$background"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
        width="100%"
        justifyContent="space-between"
        alignItems="center"
        paddingHorizontal="$4"
        paddingTop={insets.top + 12}
        paddingBottom={12}
        shadowColor="$shadowColor"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.1}
        shadowRadius={3}
        elevation={3}
      >
        {/* Avatar - Now Pressable */}
        <Pressable onPress={() => setIsModalOpen(true)}>
          <Avatar>
            {wallet?.address ? (
              <Jazzicon size={40} address={wallet.address} />
            ) : (
              <Wallet size={28} color={theme.color12} />
            )}
          </Avatar>
        </Pressable>

        {/* Wallet Address and Name */}
        <YStack gap="$1" flex={1} marginLeft="$3">
          <XStack gap="$2" alignItems="center">
            <Text fontSize={16} fontWeight="600" color="$color12">
              {shortenAddress(walletAddress)}
            </Text>
            <IconButton onPress={handleCopyAddress}>
              <Copy size={16} color={theme.color9} />
            </IconButton>
          </XStack>
          <Text fontSize={14} color="$color9">
            {wallet?.name || 'Unknown Wallet'}
          </Text>
        </YStack>

        {/* Settings Icon */}
        <Link href="/settings" asChild>
          <IconButton>
            <Settings size={24} color={theme.color9} />
          </IconButton>
        </Link>
      </XStack>

      {/* Wallet Selector Modal */}
      <WalletSelectorModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
