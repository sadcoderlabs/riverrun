import { AlertTriangle, ArrowLeft, Copy, Loader } from '@tamagui/lucide-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button, Input, Spinner, Text, XStack, YStack } from 'tamagui';
import { toast } from 'sonner-native';
import { DEPOSIT_TOKENS, ChainName } from '@/lib/riverrun/transfer-fund/constants/depositTokens';
import { useArbitrumUsdc, ARBITRUM_USDC_ADDRESS } from '@/lib/riverrun/transfer-fund/useArbitrumUsdc';
import { useActiveWallet } from '@/lib/riverrun/wallet';

// Hyperliquid Bridge contract address on Arbitrum
const HYPERLIQUID_BRIDGE_ADDRESS = '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7';

// Minimum deposit amount
const MIN_DEPOSIT_AMOUNT = 5;

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
  const router = useRouter();
  const params = useLocalSearchParams<{ symbol: string; chain: string }>();

  // Wallet and balance hooks
  const { wallet } = useActiveWallet();
  const { balance, depositUsdc } = useArbitrumUsdc();

  // Find the token based on symbol from URL params
  const token = DEPOSIT_TOKENS.find(t => t.symbol === params.symbol);

  // Find the selected chain configuration
  const selectedChain = token?.supportChains.find(sc => sc.chain === (params.chain as ChainName));

  // State
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

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
  const isValidAmount = numAmount >= MIN_DEPOSIT_AMOUNT && numAmount <= numBalance;

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
        `Please enter an amount between ${MIN_DEPOSIT_AMOUNT} and ${balance || '0'} USDC`,
      );
      return;
    }

    try {
      setIsDepositing(true);

      // Deposit USDC to Hyperliquid Bridge
      const txHash = await depositUsdc(HYPERLIQUID_BRIDGE_ADDRESS, amount);

      toast.success('Deposit Successful!', {
        description: `Transaction: ${shortenAddress(txHash)}`,
      });

      // Clear amount after successful deposit
      setAmount('');
    } catch (error) {
      console.error('Deposit failed:', error);
      Alert.alert(
        'Deposit Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <YStack flex={1} backgroundColor="$background">
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
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Main Card */}
        <YStack paddingHorizontal="$4" paddingTop="$4" gap="$4">
          {/* Call to Action Card */}
          <YStack
            backgroundColor="$background02"
            borderRadius="$4"
            padding="$4"
            borderWidth={1}
            borderColor="$borderColor"
            gap="$3"
          >
            {/* Title */}
            <Text fontFamily="$interSemiBold" fontSize="$5" color="$color" textAlign="center">
              Deposit USDC to your wallet on Arbitrum
            </Text>

            {/* Wallet Address */}
            <XStack
              backgroundColor="#F97316"
              borderRadius="$3"
              padding="$3"
              alignItems="center"
              gap="$2"
              justifyContent="center"
            >
              <Text fontSize="$5" fontFamily="$skMono" color="white" fontWeight="600">
                {shortenAddress(wallet.address, 4)}
              </Text>
              <Pressable onPress={() => handleCopyAddress(wallet.address, 'Wallet address')}>
                <Copy size={20} color="white" />
              </Pressable>
            </XStack>

            {/* USDC Contract Address */}
            <Text fontSize="$2" color="$gray10" textAlign="center">
              USDC Contract: {shortenAddress(ARBITRUM_USDC_ADDRESS, 3)}
            </Text>

            {/* Monitoring Status */}
            <XStack alignItems="center" gap="$2" justifyContent="center">
              <Loader size={16} color="#F97316" animation="slow" />
              <Text fontSize="$3" color="#F97316" fontFamily="$interMedium">
                Monitoring for deposits...
              </Text>
            </XStack>
          </YStack>
        </YStack>

        {/* Balance Display */}
        <XStack
          paddingHorizontal="$4"
          paddingVertical="$3"
          justifyContent="space-between"
          alignItems="center"
        >
          <Text fontSize="$3" color="$gray11">
            Your USDC Balance on Arbitrum:
          </Text>
          <XStack alignItems="baseline" gap="$1">
            <Text fontSize="$5" fontFamily="$interSemiBold" color="$color">
              {balance || '0.0'}
            </Text>
            <Text fontSize="$3" color="$gray10">
              USDC
            </Text>
          </XStack>
        </XStack>

        {/* Amount Input Section */}
        <YStack paddingHorizontal="$4" gap="$2" paddingTop="$2">
          <Text fontSize="$3" color="$gray11">
            Deposit Amount
          </Text>

          <YStack gap="$2">
            {/* Input with Max Button */}
            <XStack
              backgroundColor="$background02"
              borderRadius="$3"
              borderWidth={1}
              borderColor={amount && numAmount < MIN_DEPOSIT_AMOUNT ? '#F97316' : '$borderColor'}
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
                    color={isDepositing ? '$gray10' : '#F97316'}
                    fontFamily="$interSemiBold"
                  >
                    MAX
                  </Text>
                </Pressable>
                <Text fontSize="$4" color="$gray10">
                  USDC
                </Text>
              </XStack>
            </XStack>

            {/* Validation Message */}
            {amount && numAmount < MIN_DEPOSIT_AMOUNT && (
              <Text fontSize="$2" color="#F97316" fontFamily="$interMedium">
                Amount must be at least {MIN_DEPOSIT_AMOUNT} USDC
              </Text>
            )}
            {amount && numAmount > numBalance && (
              <Text fontSize="$2" color="#F97316" fontFamily="$interMedium">
                Insufficient balance
              </Text>
            )}
          </YStack>

          {/* Deposit Button */}
          <Button
            size="$5"
            backgroundColor="$background"
            borderWidth={1}
            borderColor="$borderColor"
            color="$color"
            fontFamily="$interSemiBold"
            onPress={handleDeposit}
            disabled={!isValidAmount || !amount || isDepositing}
            opacity={!isValidAmount || !amount || isDepositing ? 0.5 : 1}
            pressStyle={{ opacity: 0.8 }}
            marginTop="$3"
            icon={isDepositing ? <Spinner size="small" color="$color" /> : undefined}
          >
            {isDepositing ? 'Processing...' : 'Deposit USDC'}
          </Button>
        </YStack>

        {/* Minimum Deposit Info */}
        <XStack
          marginHorizontal="$4"
          marginTop="$4"
          padding="$3"
          backgroundColor="rgba(59, 130, 246, 0.1)"
          borderRadius="$3"
          alignItems="center"
          gap="$2"
        >
          <AlertTriangle size={20} color="#3B82F6" />
          <Text fontSize="$3" color="#3B82F6" flex={1}>
            Minimum deposit amount: {MIN_DEPOSIT_AMOUNT} USDC
          </Text>
        </XStack>

        {/* Warning Section */}
        <XStack
          marginHorizontal="$4"
          marginTop="$3"
          padding="$3"
          backgroundColor="rgba(251, 191, 36, 0.1)"
          borderRadius="$3"
          gap="$3"
        >
          <AlertTriangle size={20} color="#F59E0B" style={{ marginTop: 2 }} />
          <YStack flex={1}>
            <Text fontSize="$2" color="#F59E0B" lineHeight="$1">
              Important: This will transfer USDC from your Arbitrum wallet to the Hyperliquid bridge
              contract at {shortenAddress(HYPERLIQUID_BRIDGE_ADDRESS, 3)}. Depositing any amount
              less than minimum deposit amount will result in loss of funds.
            </Text>
          </YStack>
        </XStack>
      </ScrollView>
    </YStack>
  );
}
