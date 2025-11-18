import type { WalletInfo } from '@/contexts/wallet/ports/types';
import { Check, Wallet } from '@tamagui/lucide-icons';
import Jazzicon from 'react-native-jazzicon';
import { styled, Text, useTheme, XStack, YStack } from 'tamagui';

const StyledPressable = styled(XStack, {
  paddingHorizontal: '$4',
  paddingVertical: '$4',
  pressStyle: { backgroundColor: '$color3', opacity: 0.9 },
  cursor: 'pointer',
});

const WalletIcon = styled(XStack, {
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: '$color6',
  alignItems: 'center',
  justifyContent: 'center',
});

interface WalletListItemProps {
  wallet: WalletInfo;
  isSelected: boolean;
  onPress: () => void;
  isLastItem?: boolean;
}

function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletListItem({
  wallet,
  isSelected,
  onPress,
  isLastItem = false,
}: WalletListItemProps) {
  const theme = useTheme();

  return (
    <StyledPressable
      onPress={onPress}
      alignItems="center"
      gap="$3"
      borderBottomWidth={isLastItem ? 0 : 1}
      borderBottomColor="$borderColor"
    >
      {/* Wallet Icon */}
      <WalletIcon>
        {wallet.address ? (
          <Jazzicon size={40} address={wallet.address} />
        ) : (
          <Wallet size={24} color={theme.color12} />
        )}
      </WalletIcon>

      {/* Wallet Info */}
      <YStack flex={1} gap="$1">
        <Text fontSize={14} fontFamily="$interSemiBold" color="$color12">
          {wallet.name}
        </Text>
        <Text fontSize={14} color="$color9">
          {shortenAddress(wallet.address)}
        </Text>
      </YStack>

      {/* Selected Indicator */}
      {isSelected && (
        <XStack
          width={18}
          height={18}
          borderRadius={12}
          backgroundColor="$accent9"
          alignItems="center"
          justifyContent="center"
        >
          <Text color="$color1">
            <Check size={14} color="$color1" />
          </Text>
        </XStack>
      )}
    </StyledPressable>
  );
}
