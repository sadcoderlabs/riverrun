import { AlertTriangle, ArrowLeft, Copy } from '@tamagui/lucide-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Spinner, Text, XStack, YStack } from 'tamagui';
import { toast } from 'sonner-native';
import { useActiveWallet } from '@/hooks/useActiveWallet';

// Helper function to shorten address (first 5 and last 5 characters)
function shortenAddress(address: string, chars: number = 5): string {
  if (!address || address.length < chars * 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Hyperliquid Bridge Withdraw Page
 *
 * Dedicated page for withdrawing USDC via Hyperliquid Bridge to Arbitrum
 * Shows balance, amount input, and withdraw functionality
 */
export default function HyperliquidBridgeWithdrawPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ symbol: string; chain: string }>();

  // Wallet hooks
  const { address, isAuthenticated } = useActiveWallet();

  // State
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Mock balance - replace with actual balance hook
  const balance = '0.000000';

  if (!isAuthenticated || !address) {
    return (
      <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
        <Text>Please connect your wallet</Text>
      </YStack>
    );
  }

  const numAmount = parseFloat(amount) || 0;
  const numBalance = parseFloat(balance || '0') || 0;
  const isValidAmount = numAmount > 0 && numAmount <= numBalance;
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

      // TODO: Implement actual withdraw logic using Hyperliquid SDK
      // await exchangeClient.withdraw3(...)

      toast.success('Withdrawal Initiated!', {
        description: `Withdrawing ${amount} USDC to ${shortenAddress(recipientAddress)}`,
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
          Withdraw USDC
        </Text>
        <Text fontSize="$3" color="$gray11">
          to arbitrum
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
              placeholder="Enter Arbitrum address"
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
                <Copy size={16} color="white" />
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
              USDC
            </Text>
          </XStack>
        </XStack>

        {/* Amount Input Section */}
        <YStack paddingHorizontal="$4" gap="$2" paddingTop="$2">
          <Text fontSize="$3" color="$gray11">
            Withdrawal Amount
          </Text>

          <YStack gap="$2">
            {/* Input with Max Button */}
            <XStack
              backgroundColor="$background02"
              borderRadius="$3"
              borderWidth={1}
              borderColor={
                amount && (numAmount <= 0 || numAmount > numBalance) ? '#F97316' : '$borderColor'
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
                  USDC
                </Text>
              </XStack>
            </XStack>

            {/* Validation Message */}
            {amount && numAmount <= 0 && (
              <Text fontSize="$2" color="#F97316" fontFamily="$interMedium">
                Amount must be greater than 0
              </Text>
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
            {isWithdrawing ? 'Processing...' : 'Withdraw USDC'}
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
              Important: USDC can only be withdrawn to Arbitrum from your Hyperliquid Perpetual
              account. Important: Make sure the recipient address is correct and on the Arbitrum
              network. Withdrawals to incorrect addresses cannot be recovered.
            </Text>
          </YStack>
        </XStack>
      </ScrollView>
    </YStack>
  );
}
