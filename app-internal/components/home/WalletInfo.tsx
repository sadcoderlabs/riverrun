import { useWallet } from '@/app-internal';
import { Copy, Settings, Wallet } from '@tamagui/lucide-icons';
import * as Clipboard from 'expo-clipboard';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Jazzicon } from '@/app-internal/components/shared/Jazzicon';
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
  // Add subtle highlight to make the avatar more prominent
  borderWidth: 1,
  borderColor: '$color7',
});

const IconButton = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'center',
  padding: '$2',
  borderRadius: '$4',
  pressStyle: { opacity: 0.7, backgroundColor: '$color3' },
  hoverStyle: { backgroundColor: '$color2' },
});

function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function WalletInfo() {
  const theme = useTheme();
  const { wallet } = useWallet();
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
        paddingTop={14}
        paddingBottom={14}
        shadowColor="$shadowColor"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.15}
        shadowRadius={4}
        elevation={4}
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
        <YStack flex={1} marginLeft="$3">
          <XStack gap="$1" alignItems="center">
            <Text fontSize={14} fontWeight="700" color="$color12">
              {shortenAddress(walletAddress)}
            </Text>
            <IconButton onPress={handleCopyAddress}>
              <Copy size={16} color={theme.color11} />
            </IconButton>
          </XStack>
          <Text fontSize={14} color="$color9">
            {wallet?.name || 'Unknown Wallet'}
          </Text>
        </YStack>

        {/* Settings Icon - More prominent with color12 (white in dark theme) */}
        <Link href="/settings" asChild>
          <IconButton>
            <Settings size={24} color="$color9" />
          </IconButton>
        </Link>
      </XStack>

      {/* Wallet Selector Modal */}
      <WalletSelectorModal visible={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
