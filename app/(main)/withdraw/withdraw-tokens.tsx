import { ArrowLeft } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

/**
 * Withdraw token interface
 */
interface WithdrawToken {
  symbol: string;
  fullName: string;
  icon: string;
  withdrawMethod: 'hyperliquid-bridge' | 'unit-protocol';
  chain: string;
}

/**
 * Available tokens for withdrawal
 * USDC: via Hyperliquid Bridge
 * ETH, BTC, SOL: via Unit Protocol
 */
const WITHDRAW_TOKENS: WithdrawToken[] = [
  {
    symbol: 'USDC',
    fullName: 'USD Coin',
    icon: '💵',
    withdrawMethod: 'hyperliquid-bridge',
    chain: 'arbitrum',
  },
  {
    symbol: 'ETH',
    fullName: 'Ethereum',
    icon: 'Ξ',
    withdrawMethod: 'unit-protocol',
    chain: 'ethereum',
  },
  {
    symbol: 'BTC',
    fullName: 'Bitcoin',
    icon: '₿',
    withdrawMethod: 'unit-protocol',
    chain: 'bitcoin',
  },
  {
    symbol: 'SOL',
    fullName: 'Solana',
    icon: '◎',
    withdrawMethod: 'unit-protocol',
    chain: 'solana',
  },
];

/**
 * Withdraw Token Item Component
 */
function WithdrawTokenItem({
  token,
  onPress,
}: {
  token: WithdrawToken;
  onPress: () => void;
}) {
  return (
    <XStack
      paddingVertical="$3.5"
      paddingHorizontal="$4"
      alignItems="center"
      gap="$3"
      backgroundColor="$background"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      pressStyle={{ opacity: 0.7, backgroundColor: '$background02' }}
      onPress={onPress}
      cursor="pointer"
    >
      {/* Token Icon */}
      <XStack
        width={48}
        height={48}
        borderRadius="$12"
        backgroundColor="$background02"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize={32}>{token.icon}</Text>
      </XStack>

      {/* Token Info */}
      <YStack flex={1} gap="$1">
        <Text fontFamily="$interSemiBold" fontSize="$5" color="$color">
          {token.symbol}
        </Text>
        <Text fontSize="$3" color="$gray11">
          {token.fullName}
        </Text>
      </YStack>

      {/* Arrow */}
      <Text fontSize="$6" color="$gray10">
        ›
      </Text>
    </XStack>
  );
}

/**
 * Withdraw Screen
 *
 * Allows users to select a token to withdraw from their Hyperliquid account
 */
export default function WithdrawScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Handle token selection - navigates to appropriate bridge page
  const handleSelectToken = (token: WithdrawToken) => {
    console.log('Navigating to withdraw page:', token.withdrawMethod, token.symbol, token.chain);
    if (token.withdrawMethod === 'hyperliquid-bridge') {
      router.push({
        pathname: '/(main)/withdraw/withdraw-hl-bridge',
        params: {
          symbol: token.symbol,
          chain: token.chain,
        },
      });
    } else {
      router.push({
        pathname: '/(main)/withdraw/withdraw-unit-bridge',
        params: {
          symbol: token.symbol,
          chain: token.chain,
        },
      });
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
      {/* Header */}
      <XStack
        alignItems="center"
        gap="$3"
        paddingHorizontal="$4"
        paddingVertical="$3"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <XStack
          padding="$2"
          pressStyle={{ opacity: 0.7 }}
          onPress={() => router.back()}
          cursor="pointer"
        >
          <ArrowLeft size={24} color="$color" />
        </XStack>
        <Text fontFamily="$interSemiBold" fontSize="$6">
          Withdraw from Exchange
        </Text>
      </XStack>

      {/* Description */}
      <YStack paddingHorizontal="$4" paddingVertical="$3">
        <Text fontSize="$3" color="$gray11">
          Select a token to withdraw from your exchange account. Powered by Unit Protocol.
        </Text>
      </YStack>

      {/* Token List */}
      <FlatList
        data={WITHDRAW_TOKENS}
        keyExtractor={item => item.symbol}
        renderItem={({ item }) => (
          <WithdrawTokenItem token={item} onPress={() => handleSelectToken(item)} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </YStack>
  );
}
