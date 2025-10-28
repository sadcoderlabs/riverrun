import { Copy, Settings, User } from '@tamagui/lucide-icons';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styled, Text, useTheme, XStack, YStack } from 'tamagui';

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

interface WalletInfoProps {
  walletAddress?: string;
  walletName?: string;
}

function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function WalletInfo({
  walletAddress = '0xmock_address',
  walletName = 'mock wallet name',
}: WalletInfoProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const handleCopyAddress = () => {
    // TODO: Implement clipboard functionality
  };

  return (
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
      {/* Avatar */}
      <Avatar>
        <User size={28} color={theme.color12} />
      </Avatar>

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
          {walletName}
        </Text>
      </YStack>

      {/* Settings Icon */}
      <Link href="/(main)/settings" asChild>
        <IconButton>
          <Settings size={24} color={theme.color9} />
        </IconButton>
      </Link>
    </XStack>
  );
}
