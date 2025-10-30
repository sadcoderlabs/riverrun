import { AlertTriangle, ArrowLeft, AtSign } from '@tamagui/lucide-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Spinner, Text, XStack, YStack } from 'tamagui';
import { toast } from 'sonner-native';
import { useActiveWallet } from '@/hooks/useActiveWallet';

// Token configurations
const TOKEN_INFO: Record<
  string,
  { fullName: string; icon: string; network: string; minWithdrawal: number }
> = {
  ETH: {
    fullName: 'Ethereum',
    icon: 'Ξ',
    network: 'ethereum',
    minWithdrawal: 0.05,
  },
  BTC: {
    fullName: 'Bitcoin',
    icon: '₿',
    network: 'bitcoin',
    minWithdrawal: 0.002,
  },
  SOL: {
    fullName: 'Solana',
    icon: '◎',
    network: 'solana',
    minWithdrawal: 0.2,
  },
};

/**
 * Unit Bridge Withdraw Page
 *
 * Dedicated page for withdrawing ETH, BTC, or SOL via Unit Protocol
 * Uses Hyperliquid spotSend API to send to Unit withdrawal addresses
 */
export default function UnitBridgeWithdrawPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ symbol: string; chain: string }>();

  // Wallet hooks
  const { address, isAuthenticated } = useActiveWallet();

  // Get token info
  const tokenInfo = params.symbol ? TOKEN_INFO[params.symbol] : null;

  // State
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Mock balance - replace with actual balance hook
  const balance = '0.000000';

  if (!tokenInfo) {
    return (
      <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
        <Text>Invalid token</Text>
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
  const isValidAmount = numAmount >= tokenInfo.minWithdrawal && numAmount <= numBalance;
  const isValidAddress = recipientAddress.length > 0; // TODO: Add proper address validation

  const handleMaxPress = () => {
    if (balance) {
      setAmount(balance);
    }
  };

  const handlePasteAddress = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      setRecipientAddress(text);
      toast.success('Pasted from clipboard');
    } catch (error) {
      console.error('Failed to paste address:', error);
      toast.error('Failed to paste address');
    }
  };

  const handleWithdraw = async () => {
    if (!isValidAmount || !isValidAddress) {
      Alert.alert('Invalid Input', 'Please enter valid recipient address and amount');
      return;
    }

    try {
      setIsWithdrawing(true);

      // TODO: Implement actual withdraw logic using Hyperliquid spotSend API
      // A withdrawal is identified as a Hyperliquid transfer - greater than the minimum
      // for the source-chain - to a Unit withdrawal address.

      toast.success('Withdrawal Initiated!', {
        description: `Withdrawing ${amount} ${params.symbol}`,
      });

      // Clear form after successful withdrawal
      setAmount('');
      setRecipientAddress('');
    } catch (error) {
      console.error('Withdrawal failed:', error);
      Alert.alert(
        'Withdrawal Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    } finally {
      setIsWithdrawing(false);
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
          Withdraw {params.symbol}
        </Text>
        <Text fontSize="$3" color="$gray11">
          to {tokenInfo.network}
        </Text>
      </XStack>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Recipient Address Section */}
        <YStack paddingHorizontal="$4" paddingTop="$4" gap="$2">
          <Text fontSize="$3" color="$gray11">
            Recipient Address
          </Text>

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
              placeholder="Enter recipient address"
              placeholderTextColor="$gray10"
              value={recipientAddress}
              onChangeText={setRecipientAddress}
              fontSize="$4"
              fontFamily="$skMono"
              backgroundColor="transparent"
              borderWidth={0}
              paddingVertical="$3"
              editable={!isWithdrawing}
            />
            <Pressable onPress={handlePasteAddress} disabled={isWithdrawing}>
              <XStack
                backgroundColor="#F97316"
                paddingHorizontal="$3"
                paddingVertical="$2"
                borderRadius="$2"
                pressStyle={{ opacity: 0.7 }}
              >
                <AtSign size={16} color="white" />
              </XStack>
            </Pressable>
          </XStack>
        </YStack>

        {/* Balance Display */}
        <XStack
          paddingHorizontal="$4"
          paddingVertical="$3"
          justifyContent="space-between"
          alignItems="center"
        >
          <Text fontSize="$3" color="$gray11">
            Balance:
          </Text>
          <XStack alignItems="baseline" gap="$1">
            <Text fontSize="$5" fontFamily="$interSemiBold" color="$color">
              {balance}
            </Text>
            <Text fontSize="$3" color="$gray10">
              {params.symbol}
            </Text>
          </XStack>
        </XStack>

        {/* Amount Input Section */}
        <YStack paddingHorizontal="$4" gap="$2" paddingTop="$2">
          <Text fontSize="$3" color="$gray11">
            Amount
          </Text>

          <YStack gap="$2">
            {/* Input with Max Button */}
            <XStack
              backgroundColor="$background02"
              borderRadius="$3"
              borderWidth={1}
              borderColor={
                amount && (numAmount < tokenInfo.minWithdrawal || numAmount > numBalance)
                  ? '#F97316'
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
                fontSize="$5"
                fontFamily="$interMedium"
                backgroundColor="transparent"
                borderWidth={0}
                paddingVertical="$3"
                editable={!isWithdrawing}
              />
              <XStack gap="$2" alignItems="center">
                <Pressable onPress={handleMaxPress} disabled={isWithdrawing}>
                  <Text
                    fontSize="$3"
                    color={isWithdrawing ? '$gray10' : '#F97316'}
                    fontFamily="$interSemiBold"
                  >
                    MAX
                  </Text>
                </Pressable>
                <Text fontSize="$4" color="$gray10">
                  {params.symbol}
                </Text>
              </XStack>
            </XStack>

            {/* Validation Message */}
            {amount && numAmount < tokenInfo.minWithdrawal && (
              <XStack alignItems="center" gap="$2">
                <AlertTriangle size={16} color="#F97316" />
                <Text fontSize="$2" color="#F97316" fontFamily="$interMedium">
                  Minimum withdrawal amount: {tokenInfo.minWithdrawal} {params.symbol}
                </Text>
              </XStack>
            )}
            {amount && numAmount > numBalance && (
              <Text fontSize="$2" color="#F97316" fontFamily="$interMedium">
                Insufficient balance
              </Text>
            )}
          </YStack>

          {/* Withdraw Button */}
          <Button
            size="$5"
            backgroundColor="$background"
            borderWidth={1}
            borderColor="$borderColor"
            color="$color"
            fontFamily="$interSemiBold"
            onPress={handleWithdraw}
            disabled={!isValidAmount || !isValidAddress || !amount || isWithdrawing}
            opacity={!isValidAmount || !isValidAddress || !amount || isWithdrawing ? 0.5 : 1}
            pressStyle={{ opacity: 0.8 }}
            marginTop="$3"
            icon={isWithdrawing ? <Spinner size="small" color="$color" /> : undefined}
          >
            {isWithdrawing ? 'Processing...' : 'Withdraw'}
          </Button>
        </YStack>

        {/* Warning Section */}
        <XStack
          marginHorizontal="$4"
          marginTop="$4"
          padding="$3"
          backgroundColor="rgba(251, 191, 36, 0.1)"
          borderRadius="$3"
          gap="$3"
        >
          <AlertTriangle size={20} color="#F59E0B" style={{ marginTop: 2 }} />
          <YStack flex={1}>
            <Text fontSize="$2" color="#F59E0B" lineHeight="$1">
              Important: Double-check the recipient address is correct and matches the{' '}
              {tokenInfo.network} network. Withdrawals to incorrect addresses cannot be recovered.
            </Text>
          </YStack>
        </XStack>
      </ScrollView>
    </YStack>
  );
}
