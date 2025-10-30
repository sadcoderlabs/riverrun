import { ChevronRight, ArrowLeft } from '@tamagui/lucide-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { DEPOSIT_TOKENS, CHAINS, ChainName } from '@/lib/transfer-fund/constants/deposit-tokens';

/**
 * Select Source Chain Page
 *
 * Allows users to select which chain to deposit from
 * Navigates to receive-token page after selection
 */
export default function SelectSourceChainPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ symbol: string }>();

  // Find the token based on symbol from URL params
  const token = DEPOSIT_TOKENS.find(t => t.symbol === params.symbol);

  if (!token) {
    return (
      <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
        <Text>Token not found</Text>
      </YStack>
    );
  }

  // Get available chains from token's supportChains
  const availableChains = token.supportChains.map(supportChain => {
    const chainInfo = CHAINS[supportChain.chain];
    return {
      name: supportChain.chain,
      displayName: chainInfo.displayName,
      icon: chainInfo.icon,
      depositMethod: supportChain.depositMethod,
    };
  });

  const handleSelectChain = (chainName: ChainName) => {
    const selectedChain = token.supportChains.find(sc => sc.chain === chainName);
    if (!selectedChain) return;

    // Navigate to different pages based on deposit method
    if (selectedChain.depositMethod === 'hyperliquid-bridge') {
      // USDC goes to Hyperliquid Bridge page
      router.push({
        pathname: '/(main)/deposit/deposit-hl-bridge',
        params: {
          symbol: token.symbol,
          chain: chainName,
        },
      });
    } else {
      // BTC/ETH/SOL go to Unit Bridge page
      router.push({
        pathname: '/(main)/deposit/deposit-unit-bridge',
        params: {
          symbol: token.symbol,
          chain: chainName,
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
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color="$color" />
        </Pressable>
        <Text fontFamily="$interSemiBold" fontSize="$6">
          Select Source Chain
        </Text>
      </XStack>

      {/* Token Display */}
      <YStack alignItems="center" gap="$3" paddingVertical="$6">
        <XStack
          width={80}
          height={80}
          borderRadius="$12"
          backgroundColor="#3B82F6"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={40}>{token.icon}</Text>
        </XStack>
        <Text fontFamily="$interSemiBold" fontSize="$6">
          {token.fullName} ({token.symbol})
        </Text>
      </YStack>

      {/* Description */}
      <YStack paddingHorizontal="$4" paddingBottom="$4">
        <Text fontSize="$3" color="$gray11" textAlign="center">
          Confirm the source chain to deposit {token.symbol} from:
        </Text>
      </YStack>

      {/* Chain List */}
      <YStack>
        {availableChains.map(chain => (
          <XStack
            key={chain.name}
            paddingVertical="$4"
            paddingHorizontal="$4"
            alignItems="center"
            gap="$3"
            borderBottomWidth={1}
            borderBottomColor="$borderColor"
            backgroundColor="$background"
            pressStyle={{ backgroundColor: '$background02' }}
            onPress={() => handleSelectChain(chain.name)}
            cursor="pointer"
          >
            {/* Chain Icon */}
            <XStack
              width={48}
              height={48}
              borderRadius="$12"
              backgroundColor="#3B82F6"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={24}>{chain.icon}</Text>
            </XStack>

            {/* Chain Info */}
            <YStack flex={1} gap="$1">
              <Text fontFamily="$interSemiBold" fontSize="$4">
                {chain.displayName}
              </Text>
            </YStack>

            {/* Chevron */}
            <ChevronRight size={20} color="$gray10" />
          </XStack>
        ))}
      </YStack>
    </YStack>
  );
}
