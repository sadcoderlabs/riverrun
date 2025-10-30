import { AlertTriangle, ArrowLeft, Copy, Loader } from '@tamagui/lucide-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Spinner, Text, XStack, YStack } from 'tamagui';
import { toast } from 'sonner-native';
import { DEPOSIT_TOKENS, ChainName } from '@/lib/transfer-fund/constants/deposit-tokens';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useArbitrumUSDCBalance, ARBITRUM_USDC_ADDRESS } from '@/hooks/useArbitrumUSDCBalance';

// Hyperliquid Bridge contract address on Arbitrum
const HYPERLIQUID_BRIDGE_ADDRESS = '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7';

// Minimum deposit amount
const MIN_DEPOSIT_AMOUNT = 5;

// Helper function to shorten address
function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

/**
 * Hyperliquid Bridge Page
 *
 * Dedicated page for depositing USDC via Hyperliquid Bridge from Arbitrum
 * Shows real-time balance, amount input, and deposit functionality
 */
export default function HyperliquidBridgePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ symbol: string; chain: string }>();

  // Wallet and balance hooks
  const { address, isAuthenticated } = useActiveWallet();
  const { balance, isLoading: isBalanceLoading, error, transfer } = useArbitrumUSDCBalance();

  // Find the token based on symbol from URL params
  const token = DEPOSIT_TOKENS.find(t => t.symbol === params.symbol);

  // Find the selected chain configuration
  const selectedChain = token?.supportChains.find(sc => sc.chain === (params.chain as ChainName));

  // State
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  if (!token || !selectedChain || selectedChain.depositMethod !== 'hyperliquid-bridge') {
    return (
      <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
        <Text>Invalid token or deposit method</Text>
      </YStack>
    );
  }

  if (!isAuthenticated || !address) {
    return (
      <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
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

      // Transfer USDC to Hyperliquid Bridge
      const txHash = await transfer(HYPERLIQUID_BRIDGE_ADDRESS, amount);

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

        {/* Wallet Address Section */}
        <YStack paddingHorizontal="$4" paddingBottom="$3" gap="$2">
          <Text fontSize="$3" color="$gray11" fontFamily="$interMedium">
            Your Wallet Address
          </Text>
          <XStack
            backgroundColor="$background02"
            borderRadius="$3"
            padding="$3"
            borderWidth={1}
            borderColor="$borderColor"
            alignItems="center"
            gap="$2"
          >
            <Text
              flex={1}
              fontSize="$3"
              fontFamily="$skMono"
              color="$color"
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {address}
            </Text>
            <Pressable onPress={() => handleCopyAddress(address, 'Wallet address')}>
              <Copy size={20} color="$gray10" />
            </Pressable>
          </XStack>
        </YStack>

        {/* USDC Contract Address Section */}
        <YStack paddingHorizontal="$4" paddingBottom="$4" gap="$2">
          <Text fontSize="$3" color="$gray11" fontFamily="$interMedium">
            Arbitrum USDC Contract
          </Text>
          <XStack
            backgroundColor="$background02"
            borderRadius="$3"
            padding="$3"
            borderWidth={1}
            borderColor="$borderColor"
            alignItems="center"
            gap="$2"
          >
            <Text
              flex={1}
              fontSize="$2"
              fontFamily="$skMono"
              color="$gray11"
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {ARBITRUM_USDC_ADDRESS}
            </Text>
            <Pressable onPress={() => handleCopyAddress(ARBITRUM_USDC_ADDRESS, 'Contract address')}>
              <Copy size={18} color="$gray10" />
            </Pressable>
          </XStack>
          <Text fontSize="$2" color="$gray10" fontStyle="italic">
            Verify you're depositing the correct token
          </Text>
        </YStack>

        {/* Balance Section */}
        <YStack paddingHorizontal="$4" paddingBottom="$4" gap="$2">
          <XStack alignItems="center" gap="$2">
            <Text fontSize="$3" color="$gray11" fontFamily="$interMedium">
              Your Arbitrum USDC Balance
            </Text>
            {isBalanceLoading && <Spinner size="small" color="$gray10" />}
          </XStack>
          <XStack alignItems="baseline" gap="$2">
            <Text fontSize="$8" fontFamily="$interSemiBold" color="$color">
              {balance || '0.00'}
            </Text>
            <Text fontSize="$5" color="$gray10">
              USDC
            </Text>
          </XStack>
          {error ? (
            <Text fontSize="$2" color="#F97316">
              {error}
            </Text>
          ) : (
            <XStack alignItems="center" gap="$2">
              <Loader size={16} color="$gray10" />
              <Text fontSize="$2" color="$gray10">
                Balance updates every 10 seconds
              </Text>
            </XStack>
          )}
        </YStack>

        {/* Minimum Deposit Warning */}
        <XStack
          marginHorizontal="$4"
          marginBottom="$3"
          padding="$3"
          backgroundColor="rgba(249, 115, 22, 0.15)"
          borderRadius="$3"
          borderWidth={2}
          borderColor="#F97316"
          alignItems="center"
          gap="$3"
        >
          <AlertTriangle size={24} color="#F97316" />
          <YStack flex={1}>
            <Text fontSize="$4" color="#F97316" fontFamily="$interSemiBold">
              Minimum Deposit: {MIN_DEPOSIT_AMOUNT} USDC
            </Text>
            <Text fontSize="$2" color="#F97316" marginTop="$1">
              Deposits below {MIN_DEPOSIT_AMOUNT} USDC are not accepted
            </Text>
          </YStack>
        </XStack>

        {/* Amount Input Section */}
        <YStack paddingHorizontal="$4" gap="$3" paddingTop="$1">
          <Text fontSize="$3" color="$gray11" fontFamily="$interMedium">
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
            backgroundColor="#F97316"
            color="white"
            fontFamily="$interSemiBold"
            onPress={handleDeposit}
            disabled={!isValidAmount || !amount || isDepositing}
            opacity={!isValidAmount || !amount || isDepositing ? 0.5 : 1}
            pressStyle={{ opacity: 0.8 }}
            marginTop="$2"
            icon={isDepositing ? <Spinner size="small" color="white" /> : undefined}
          >
            {isDepositing ? 'Processing...' : 'Deposit'}
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
              Important: Deposits are processed via Hyperliquid Bridge on Arbitrum. Make sure you're
              on Arbitrum network and have sufficient USDC balance. The transfer will require you to
              sign a transaction. Bridge address: {shortenAddress(HYPERLIQUID_BRIDGE_ADDRESS)}
            </Text>
          </YStack>
        </XStack>
      </ScrollView>
    </YStack>
  );
}
