import { DepositSearchBar } from '@/components/home/transfer-fund/deposit/deposit-search-bar';
import { DepositTokenItem } from '@/components/home/transfer-fund/deposit/deposit-token-item';
import { useDepositTokens } from '@/lib/transfer-fund/hooks/useDepositTokens';
import { DepositToken } from '@/lib/transfer-fund/constants/deposit-tokens';
import { ArrowLeft } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

/**
 * Deposit Screen
 *
 * Allows users to select a token to deposit to their Hyperliquid account
 * Powered by Unit Protocol integration
 */
export default function DepositScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens, searchQuery, setSearchQuery, isLoading, error } = useDepositTokens();

  // Handle token selection - navigates to chain selection page
  const handleSelectToken = (token: DepositToken) => {
    router.push({
      pathname: '/(main)/deposit/select-source-chain',
      params: {
        symbol: token.symbol,
      },
    });
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
          Deposit to Hyperliquid
        </Text>
      </XStack>

      {/* Description */}
      <YStack paddingHorizontal="$4" paddingVertical="$3">
        <Text fontSize="$3" color="$gray11">
          Select a token to deposit to your Hyperliquid account. Powered by Unit Protocol.
        </Text>
      </YStack>

      {/* Search Bar */}
      <DepositSearchBar value={searchQuery} onChangeText={setSearchQuery} />

      {/* Loading State */}
      {isLoading && (
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
          <Text fontSize="$3" color="$gray11">
            Loading estimation times...
          </Text>
        </YStack>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <YStack padding="$4">
          <Text fontSize="$3" color="$red10">
            {error}
          </Text>
        </YStack>
      )}

      {/* Token List */}
      {!isLoading && (
        <FlatList
          data={tokens}
          keyExtractor={item => item.symbol}
          renderItem={({ item }) => (
            <DepositTokenItem token={item} onPress={() => handleSelectToken(item)} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </YStack>
  );
}
