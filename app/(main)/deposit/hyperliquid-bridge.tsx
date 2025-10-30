import { AlertTriangle, ArrowLeft } from '@tamagui/lucide-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Text, XStack, YStack } from 'tamagui';
import { DEPOSIT_TOKENS } from '@/lib/transfer-fund/constants/deposit-tokens';

/**
 * Hyperliquid Bridge Page
 *
 * Dedicated page for depositing USDC via Hyperliquid Bridge from Arbitrum
 * Shows balance, amount input, and deposit button
 */
export default function HyperliquidBridgePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ symbol: string; chain: string }>();

  // Find the token based on symbol from URL params
  const token = DEPOSIT_TOKENS.find(t => t.symbol === params.symbol);

  // State
  const [amount, setAmount] = useState('');

  // Placeholder balance (will be replaced with real balance later)
  const mockBalance = '1234.56';

  if (!token || token.depositMethod !== 'hyperliquid-bridge') {
    return (
      <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
        <Text>Invalid token or deposit method</Text>
      </YStack>
    );
  }

  const minAmount = token.minDepositAmount || 5;
  const numAmount = parseFloat(amount) || 0;
  const numBalance = parseFloat(mockBalance) || 0;
  const isValidAmount = numAmount >= minAmount && numAmount <= numBalance;

  const handleMaxPress = () => {
    setAmount(mockBalance);
  };

  const handleDeposit = () => {
    if (!isValidAmount) {
      Alert.alert(
        'Invalid Amount',
        `Please enter an amount between ${minAmount} and ${mockBalance} USDC`,
      );
      return;
    }

    // TODO: Implement actual deposit functionality
    Alert.alert('Deposit', 'Deposit functionality will be implemented later');
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
          Deposit {token.symbol}
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

        {/* Balance Section */}
        <YStack paddingHorizontal="$4" paddingBottom="$4" gap="$2">
          <Text fontSize="$3" color="$gray11" fontFamily="$interMedium">
            Your Arbitrum USDC Balance
          </Text>
          <XStack alignItems="baseline" gap="$2">
            <Text fontSize="$8" fontFamily="$interSemiBold" color="$color">
              {mockBalance}
            </Text>
            <Text fontSize="$5" color="$gray10">
              USDC
            </Text>
          </XStack>
          <Text fontSize="$2" color="$gray10">
            Balance on Arbitrum network
          </Text>
        </YStack>

        {/* Amount Input Section */}
        <YStack paddingHorizontal="$4" gap="$3" paddingTop="$3">
          <Text fontSize="$3" color="$gray11" fontFamily="$interMedium">
            Deposit Amount
          </Text>

          <YStack gap="$2">
            {/* Input with Max Button */}
            <XStack
              backgroundColor="$background02"
              borderRadius="$3"
              borderWidth={1}
              borderColor="$borderColor"
              alignItems="center"
              paddingRight="$3"
            >
              <Input
                flex={1}
                placeholder="0.00"
                placeholderTextColor="$gray10"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                fontSize="$5"
                fontFamily="$interMedium"
                backgroundColor="transparent"
                borderWidth={0}
                paddingVertical="$3"
              />
              <XStack gap="$2" alignItems="center">
                <Pressable onPress={handleMaxPress}>
                  <Text fontSize="$3" color="#F97316" fontFamily="$interSemiBold">
                    MAX
                  </Text>
                </Pressable>
                <Text fontSize="$4" color="$gray10">
                  USDC
                </Text>
              </XStack>
            </XStack>

            {/* Validation Message */}
            <Text fontSize="$2" color="$gray10">
              Minimum: {minAmount} USDC
            </Text>
          </YStack>

          {/* Deposit Button */}
          <Button
            size="$5"
            backgroundColor="#F97316"
            color="white"
            fontFamily="$interSemiBold"
            onPress={handleDeposit}
            disabled={!isValidAmount || !amount}
            opacity={!isValidAmount || !amount ? 0.5 : 1}
            pressStyle={{ opacity: 0.8 }}
            marginTop="$2"
          >
            Deposit
          </Button>
        </YStack>

        {/* Warning Section */}
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
              Important: Deposits are processed via Hyperliquid Bridge on Arbitrum. Minimum deposit
              is {minAmount} USDC. Make sure you have sufficient USDC balance on Arbitrum network
              before proceeding. The transfer will require you to sign a transaction.
            </Text>
          </YStack>
        </XStack>
      </ScrollView>
    </YStack>
  );
}
