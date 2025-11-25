import {
  ARBITRUM_CONFIG,
  BRIDGE_LIMITS,
  useBridge,
  useScreenTracking,
  useWallet,
} from '@/app-internal';
import { Button, CustomHeader } from '@/app-internal/components/global';
import { Input } from '@/app-internal/components/global/Input';
import { Text } from '@/app-internal/components/global/Text';
import { DEPOSIT_TOKENS, type ChainName } from '@/contexts/bridge/depositTokens';
import { AlertTriangle } from '@tamagui/lucide-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import { toast } from 'sonner-native';
import { Spinner, XStack, YStack } from 'tamagui';

// Helper function to shorten address (first 5 and last 5 characters)
function shortenAddress(address: string, chars: number = 5): string {
  if (!address || address.length < chars * 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Hyperliquid Bridge Page
 *
 * Dedicated page for depositing USDC via Hyperliquid Bridge from Arbitrum
 * Shows real-time balance, amount input, and deposit functionality
 * Safe area is handled by parent layout
 */
export default function HyperliquidBridgePage() {
  useScreenTracking('DepositBridge');

  const params = useLocalSearchParams<{ symbol: string; chain: string }>();

  // Wallet and bridge hooks
  const { wallet } = useWallet();
  const { arbitrumBalance: balance, deposit, refreshBalances, isDepositing } = useBridge();

  // Find the token based on symbol from URL params
  const token = DEPOSIT_TOKENS.find(t => t.symbol === params.symbol);

  // Find the selected chain configuration
  const selectedChain = token?.supportChains.find(sc => sc.chain === (params.chain as ChainName));

  // State
  const [amount, setAmount] = useState('');

  // Refresh balance on mount
  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  if (!token || !selectedChain || selectedChain.depositMethod !== 'hyperliquid-bridge') {
    return (
      <YStack flex={1} backgroundColor="$background">
        <Text>Invalid token or deposit method</Text>
      </YStack>
    );
  }

  if (!wallet) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <Text>Please connect your wallet</Text>
      </YStack>
    );
  }

  const numAmount = parseFloat(amount) || 0;
  const numBalance = parseFloat(balance || '0') || 0;
  const isValidAmount = numAmount >= BRIDGE_LIMITS.minimumDeposit && numAmount <= numBalance;

  const handleMaxPress = () => {
    if (balance) {
      setAmount(balance);
    }
  };

  const handleDeposit = async () => {
    if (!isValidAmount) {
      Alert.alert(
        'Invalid Amount',
        `Please enter an amount between ${BRIDGE_LIMITS.minimumDeposit} and ${balance || '0'} USDC`,
      );
      return;
    }

    try {
      // Deposit USDC to Hyperliquid Bridge
      const result = await deposit(amount);

      toast.success('Deposit Successful!', {
        description: `Transaction: ${shortenAddress(result.txHash)}`,
      });

      // Clear amount after successful deposit
      setAmount('');
    } catch (error) {
      console.error('Deposit failed:', error);
      Alert.alert(
        'Deposit Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <CustomHeader title="Deposit 2/2" />

      {/* Main Content Area - Flex to push submit section to bottom */}
      <YStack flex={1} justifyContent="space-between">
        {/* Scrollable Content */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          {/* Balance & Policy Display Section */}
          <YStack paddingHorizontal="$4" paddingTop="$4" gap="$2">
            <XStack padding="$3" marginTop="$3" backgroundColor="$gray2" borderRadius="$3">
              <YStack flex={1} gap="$2">
                <XStack alignItems="center" justifyContent="space-between">
                  <Text.Footnote color="$color10">Available</Text.Footnote>
                  <Text.Footnote color="$color12" fontWeight="500">
                    {balance || '0.00'} USDC
                  </Text.Footnote>
                </XStack>
                <XStack alignItems="center" justifyContent="space-between">
                  <Text.Footnote color="$color10">Minimum</Text.Footnote>
                  <Text.Footnote color="$color12" fontWeight="500">
                    {BRIDGE_LIMITS.minimumDeposit} USDC
                  </Text.Footnote>
                </XStack>
                <XStack alignItems="center" justifyContent="space-between">
                  <Text.Footnote color="$color10">Processing time</Text.Footnote>
                  <Text.Footnote color="$color12" fontWeight="500">
                    ~5 minutes
                  </Text.Footnote>
                </XStack>
              </YStack>
            </XStack>
          </YStack>

          {/* Deposit Details Section */}
          {/* Amount Input */}
          <YStack paddingHorizontal="$4" gap="$2" marginTop="$5">
            <Text.Subhead color="$color11">Amount</Text.Subhead>

            <YStack gap="$1">
              {/* Input with Max Button */}
              <XStack
                backgroundColor="$background02"
                borderRadius="$3"
                borderWidth={1}
                borderColor={
                  amount && (numAmount <= 0 || numAmount < BRIDGE_LIMITS.minimumDeposit)
                    ? '$red9'
                    : '$borderColor'
                }
                alignItems="center"
                paddingRight="$3"
              >
                <Input
                  flex={1}
                  placeholder="0.0"
                  placeholderTextColor="$gray10"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  fontSize="$3"
                  backgroundColor="transparent"
                  borderWidth={0}
                  paddingVertical="$2"
                  editable={!isDepositing}
                />
                <XStack gap="$2" alignItems="center">
                  <Pressable onPress={handleMaxPress} disabled={isDepositing}>
                    <XStack
                      backgroundColor="$gray5"
                      paddingVertical="$1"
                      paddingHorizontal="$2"
                      borderRadius="$1"
                    >
                      <Text
                        fontSize="$2"
                        color={isDepositing ? '$color9' : '$color12'}
                        fontWeight="500"
                      >
                        MAX
                      </Text>
                    </XStack>
                  </Pressable>
                  <Text.Footnote color="$color10">USDC</Text.Footnote>
                </XStack>
              </XStack>

              {/* Validation Message */}
              {amount && numAmount > 0 && numAmount < BRIDGE_LIMITS.minimumDeposit && (
                <Text.Footnote color="$red9">
                  Minimum deposit amount: {BRIDGE_LIMITS.minimumDeposit} USDC
                </Text.Footnote>
              )}
              {amount && numAmount > numBalance && (
                <Text.Footnote color="$red9">Insufficient balance</Text.Footnote>
              )}
            </YStack>
          </YStack>
        </ScrollView>

        {/* Submit Section - Fixed at bottom with safe zone padding */}
        <YStack paddingHorizontal="$4" paddingBottom="$4" marginTop="$2" gap="$3">
          <XStack
            padding="$4"
            backgroundColor="$yellow2"
            borderRadius="$3"
            gap="$3"
            alignItems="flex-start"
          >
            <AlertTriangle size={16} color="$yellow9" />
            <YStack flex={1}>
              <YStack gap="$1" alignItems="flex-start" style={{ marginTop: -3 }}>
                <Text.Footnote color="$yellow9" fontWeight="700">
                  Important Information
                </Text.Footnote>
                <XStack gap="$2" alignItems="flex-start">
                  <Text.Caption color="$yellow9">•</Text.Caption>
                  <Text.Footnote color="$yellow9">
                    This transfers USDC to the Hyperliquid bridge contract{' '}
                    {shortenAddress(ARBITRUM_CONFIG.bridgeAddress, 3)}
                  </Text.Footnote>
                </XStack>
                <XStack gap="$2" alignItems="flex-start">
                  <Text.Caption color="$yellow9">•</Text.Caption>
                  <Text.Footnote color="$yellow9">
                    Deposits below minimum required will result in loss of funds
                  </Text.Footnote>
                </XStack>
              </YStack>
            </YStack>
          </XStack>
          <Button.Filled
            level="lg"
            height="$5"
            onPress={handleDeposit}
            disabled={!isValidAmount || !amount || isDepositing}
            opacity={!isValidAmount || !amount || isDepositing ? 0.5 : 1}
            icon={isDepositing ? <Spinner size="small" color="$color1" /> : undefined}
          >
            {isDepositing ? 'Processing...' : 'Confirm'}
          </Button.Filled>
        </YStack>
      </YStack>
    </YStack>
  );
}
