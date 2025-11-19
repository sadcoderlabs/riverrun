import { ARBITRUM_CONFIG, BRIDGE_LIMITS, useBridge, useWallet } from '@/app-internal';
import { Button, CustomHeader } from '@/app-internal/components/global';
import { CardContainer } from '@/app-internal/components/global/CardContainer';
import { Input } from '@/app-internal/components/global/Input';
import { Text } from '@/app-internal/components/global/Text';
import { DEPOSIT_TOKENS, type ChainName } from '@/contexts/bridge/depositTokens';
import { AlertTriangle, Copy, Loader } from '@tamagui/lucide-icons';
import * as Clipboard from 'expo-clipboard';
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

  const handleCopyAddress = async (addressToCopy: string, label: string) => {
    try {
      await Clipboard.setStringAsync(addressToCopy);
      toast.success('Copied!', {
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      console.error('Failed to copy address:', error);
      toast.error('Failed to copy address');
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
      <CustomHeader title={`Deposit ${token.symbol}`} />

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Main Card */}
        <YStack paddingHorizontal="$4" paddingTop="$4" gap="$4">
          {/* Call to Action Card */}
          <CardContainer gap="$3">
            {/* Title */}
            <Text fontFamily="$interSemiBold" fontSize="$5" color="$color12" textAlign="center">
              Deposit USDC to your wallet on Arbitrum
            </Text>

            {/* Wallet Address */}
            <XStack
              backgroundColor="$accent9"
              borderRadius="$3"
              padding="$3"
              alignItems="center"
              gap="$2"
              justifyContent="center"
            >
              <Text fontSize="$5" fontFamily="$skMono" color="$color1" fontWeight="600">
                {shortenAddress(wallet.address, 4)}
              </Text>
              <Pressable onPress={() => handleCopyAddress(wallet.address, 'Wallet address')}>
                <Copy size={20} color="$color1" />
              </Pressable>
            </XStack>

            {/* USDC Contract Address */}
            <Text.Footnote color="$color10" textAlign="center">
              USDC Contract: {shortenAddress(ARBITRUM_CONFIG.usdcAddress, 3)}
            </Text.Footnote>

            {/* Monitoring Status */}
            <XStack alignItems="center" gap="$2" justifyContent="center">
              <Loader size={16} color="$accent9" animation="slow" />
              <Text.Subhead color="$accent9" fontFamily="$interMedium">
                Monitoring for deposits...
              </Text.Subhead>
            </XStack>
          </CardContainer>
        </YStack>

        {/* Balance Display */}
        <XStack
          paddingHorizontal="$4"
          paddingVertical="$3"
          justifyContent="space-between"
          alignItems="center"
        >
          <Text.Subhead color="$color11">Your USDC Balance on Arbitrum:</Text.Subhead>
          <XStack alignItems="baseline" gap="$1">
            <Text fontSize="$5" fontFamily="$interSemiBold" color="$color12">
              {balance || '0.0'}
            </Text>
            <Text.Subhead color="$color10">USDC</Text.Subhead>
          </XStack>
        </XStack>

        {/* Amount Input Section */}
        <YStack paddingHorizontal="$4" gap="$2" paddingTop="$2">
          <Text.Subhead color="$color11">Deposit Amount</Text.Subhead>

          <YStack gap="$2">
            {/* Input with Max Button */}
            <XStack
              backgroundColor="$background02"
              borderRadius="$3"
              borderWidth={1}
              borderColor={
                amount && numAmount < BRIDGE_LIMITS.minimumDeposit ? '$accent9' : '$borderColor'
              }
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
                editable={!isDepositing}
              />
              <XStack gap="$2" alignItems="center">
                <Pressable onPress={handleMaxPress} disabled={isDepositing}>
                  <Text
                    fontSize="$3"
                    color={isDepositing ? '$color10' : '$accent9'}
                    fontFamily="$interSemiBold"
                  >
                    MAX
                  </Text>
                </Pressable>
                <Text color="$color10">USDC</Text>
              </XStack>
            </XStack>

            {/* Validation Message */}
            {amount && numAmount < BRIDGE_LIMITS.minimumDeposit && (
              <Text.Footnote color="$accent9" fontFamily="$interMedium">
                Amount must be at least {BRIDGE_LIMITS.minimumDeposit} USDC
              </Text.Footnote>
            )}
            {amount && numAmount > numBalance && (
              <Text.Footnote color="$accent9" fontFamily="$interMedium">
                Insufficient balance
              </Text.Footnote>
            )}
          </YStack>

          {/* Deposit Button */}
          <Button.Filled
            level="lg"
            onPress={handleDeposit}
            disabled={!isValidAmount || !amount || isDepositing}
            opacity={!isValidAmount || !amount || isDepositing ? 0.5 : 1}
            marginTop="$3"
            icon={isDepositing ? <Spinner size="small" color="$color1" /> : undefined}
          >
            {isDepositing ? 'Processing...' : 'Deposit USDC'}
          </Button.Filled>
        </YStack>

        {/* Minimum Deposit Info */}
        <XStack
          marginHorizontal="$4"
          marginTop="$4"
          padding="$3"
          backgroundColor="$yellow2"
          borderRadius="$3"
          alignItems="center"
          gap="$2"
        >
          <AlertTriangle size={20} color="$yellow9" />
          <Text.Subhead color="$yellow9" flex={1}>
            Minimum deposit amount: {BRIDGE_LIMITS.minimumDeposit} USDC
          </Text.Subhead>
        </XStack>

        {/* Warning Section */}
        <XStack
          marginHorizontal="$4"
          marginTop="$3"
          padding="$3"
          backgroundColor="$yellow2"
          borderRadius="$3"
          gap="$3"
        >
          <AlertTriangle size={20} color="$yellow9" style={{ marginTop: 2 }} />
          <YStack flex={1}>
            <Text.Footnote color="$yellow9" lineHeight="$1">
              Important: This will transfer USDC from your Arbitrum wallet to the Hyperliquid bridge
              contract at {shortenAddress(ARBITRUM_CONFIG.bridgeAddress, 3)}. Depositing any amount
              less than minimum deposit amount will result in loss of funds.
            </Text.Footnote>
          </YStack>
        </XStack>
      </ScrollView>
    </YStack>
  );
}
