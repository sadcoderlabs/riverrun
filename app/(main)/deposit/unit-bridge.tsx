import { AlertTriangle, Copy, ArrowLeft } from '@tamagui/lucide-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, XStack, YStack } from 'tamagui';
import { DEPOSIT_TOKENS, ChainName } from '@/lib/transfer-fund/constants/deposit-tokens';

/**
 * Unit Bridge Page
 *
 * Displays deposit address and instructions for receiving tokens via Unit Protocol
 * Shows minimum deposit amount and important warnings
 */
export default function UnitBridgePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ symbol: string; chain: string }>();

  const [isCopying, setIsCopying] = useState(false);

  // Find the token based on symbol from URL params
  const token = DEPOSIT_TOKENS.find(t => t.symbol === params.symbol);

  // Find the selected chain configuration
  const selectedChain = token?.supportChains.find(sc => sc.chain === (params.chain as ChainName));

  if (!token || !selectedChain) {
    return (
      <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
        <Text>Token or chain not found</Text>
      </YStack>
    );
  }

  // TODO: Generate real deposit address from Unit Protocol API
  const depositAddress = '0x4F78D6eA93395be76AFeBfA624BD714E8AcAc3Bf';

  // Placeholder minimum amount (will be implemented later based on token/chain)
  const minimumAmount = '0.05';

  const handleCopyAddress = async () => {
    if (!depositAddress) return;

    try {
      setIsCopying(true);
      await Clipboard.setStringAsync(depositAddress);
      // Show success feedback
      Alert.alert('Copied!', 'Address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy address:', error);
      Alert.alert('Error', 'Failed to copy address');
    } finally {
      setIsCopying(false);
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
          Receive {token.symbol}
        </Text>
      </XStack>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Token Display */}
        <YStack alignItems="center" gap="$3" paddingVertical="$5">
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
        <YStack paddingHorizontal="$4" paddingBottom="$3">
          <Text fontSize="$3" color="$gray11" textAlign="center">
            Use the address below to receive {token.symbol} to your exchange account.
          </Text>
        </YStack>

        {/* Minimum Amount Warning */}
        <XStack
          marginHorizontal="$4"
          marginBottom="$3"
          padding="$3"
          backgroundColor="rgba(249, 115, 22, 0.1)"
          borderRadius="$3"
          alignItems="center"
          gap="$2"
        >
          <AlertTriangle size={20} color="#F97316" />
          <Text fontSize="$3" color="#F97316">
            Minimum deposit amount: {minimumAmount} {token.symbol}
          </Text>
        </XStack>

        {/* Deposit Address Section */}
        <YStack paddingHorizontal="$4" gap="$3">
          <Text fontSize="$3" color="$gray11" fontFamily="$interMedium">
            Your Deposit Address
          </Text>

          <YStack
            backgroundColor="$background02"
            borderRadius="$3"
            padding="$3"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <Text fontSize="$2" color="$gray11" marginBottom="$1">
              Address
            </Text>
            <Text
              fontSize="$3"
              fontFamily="$skMono"
              color="$color"
              style={{ wordWrap: 'break-word' }}
            >
              {depositAddress}
            </Text>
          </YStack>

          {/* Copy Button */}
          <Button
            size="$5"
            backgroundColor="#F97316"
            color="white"
            fontFamily="$interSemiBold"
            onPress={handleCopyAddress}
            disabled={isCopying}
            opacity={isCopying ? 0.5 : 1}
            pressStyle={{ opacity: 0.8 }}
            icon={<Copy size={20} color="white" />}
          >
            Copy Address
          </Button>
        </YStack>

        {/* Warning Message */}
        <XStack
          marginHorizontal="$4"
          marginTop="$4"
          padding="$3"
          backgroundColor="rgba(249, 115, 22, 0.1)"
          borderRadius="$3"
          gap="$3"
        >
          <AlertTriangle size={20} color="#F97316" style={{ marginTop: 2 }} />
          <YStack flex={1}>
            <Text fontSize="$2" color="#F97316" lineHeight="$1">
              Important: Deposits are powered by Unit Protocol. There is a minimum deposit of{' '}
              {minimumAmount} {token.symbol}. This address can only receive {token.symbol} on the{' '}
              {params.chain} network. Any other asset (e.g., USDC, USDT) sent from {params.chain}{' '}
              will be lost. Deposits below {minimumAmount} {token.symbol} will result in a loss of
              funds.
            </Text>
          </YStack>
        </XStack>
      </ScrollView>
    </YStack>
  );
}
