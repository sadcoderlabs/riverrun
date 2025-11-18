import { AlertTriangle, ArrowLeft, ClipboardPaste } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button, Input, Spinner, Text, XStack, YStack } from 'tamagui';
import { toast } from 'sonner-native';
import { useWallet, useBridge, BRIDGE_LIMITS, BRIDGE_FEES } from '@/app-internal';

// Validate Ethereum address format
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Hyperliquid Bridge Withdraw Page
 *
 * Dedicated page for withdrawing USDC via Hyperliquid Bridge to Arbitrum
 * Shows balance, amount input, and withdraw functionality
 * Safe area is handled by parent layout
 */
export default function HyperliquidBridgeWithdrawPage() {
  const router = useRouter();

  // Wallet hooks
  const { wallet } = useWallet();

  // Bridge hooks
  const {
    withdrawableBalance,
    isLoadingBalances: isLoadingBalance,
    withdraw,
    refreshBalances,
    isWithdrawing,
  } = useBridge();

  // State
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');

  // Load withdrawable balance on mount
  useEffect(() => {
    if (wallet) {
      refreshBalances();
    }
  }, [wallet, refreshBalances]);

  if (!wallet) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <Text>Please connect your wallet</Text>
      </YStack>
    );
  }

  const numAmount = parseFloat(amount) || 0;
  const numBalance = parseFloat(withdrawableBalance || '0') || 0;
  const isValidAmount = numAmount >= BRIDGE_LIMITS.minimumWithdrawal && numAmount <= numBalance;
  const isValidRecipient = isValidAddress(recipientAddress);

  const handleMaxPress = () => {
    if (withdrawableBalance) {
      setAmount(withdrawableBalance);
    }
  };

  const handlePasteAddress = async () => {
    try {
      const text = await Clipboard.getStringAsync();

      if (!text) {
        toast.error('Clipboard is empty');
        return;
      }

      setRecipientAddress(text);
    } catch (error) {
      console.error('Failed to paste address:', error);
      toast.error('Failed to paste address');
    }
  };

  const handleWithdraw = async () => {
    if (!isValidAmount) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount');
      return;
    }

    if (!isValidRecipient) {
      Alert.alert('Invalid Address', 'Please enter a valid Arbitrum address (0x...)');
      return;
    }

    try {
      // Execute withdrawal
      const result = await withdraw(recipientAddress, amount);

      if (result.success) {
        // Clear form after successful withdrawal
        setAmount('');
        setRecipientAddress('');
      }
    } catch (error) {
      // Error handling is already done in the bridge service/hook
      console.error('Withdrawal failed:', error);
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
          Withdraw USDC
        </Text>
        <Text fontSize="$3" color="$gray11">
          to arbitrum
        </Text>
      </XStack>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
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
            paddingRight="$2"
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
            <Pressable
              onPress={handlePasteAddress}
              disabled={isWithdrawing}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => ({
                backgroundColor: '#F97316',
                paddingHorizontal: 8,
                paddingVertical: 8,
                borderRadius: 6,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <ClipboardPaste size={16} color="white" />
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
            Withdrawable Balance:
          </Text>
          {isLoadingBalance ? (
            <Spinner size="small" color="$color" />
          ) : (
            <XStack alignItems="baseline" gap="$1">
              <Text fontSize="$5" fontFamily="$interSemiBold" color="$color">
                {withdrawableBalance || '0.000000'}
              </Text>
              <Text fontSize="$3" color="$gray10">
                USDC
              </Text>
            </XStack>
          )}
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
            {amount && numAmount > 0 && numAmount < BRIDGE_LIMITS.minimumWithdrawal && (
              <Text fontSize="$2" color="#F97316" fontFamily="$interMedium">
                Minimum withdrawal amount: {BRIDGE_LIMITS.minimumWithdrawal} USDC
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
            disabled={!isValidAmount || !isValidRecipient || !amount || isWithdrawing}
            opacity={!isValidAmount || !isValidRecipient || !amount || isWithdrawing ? 0.5 : 1}
            pressStyle={{ opacity: 0.8 }}
            marginTop="$3"
            icon={isWithdrawing ? <Spinner size="small" color="$color" /> : undefined}
          >
            {isWithdrawing ? 'Processing...' : 'Withdraw USDC'}
          </Button>
        </YStack>

        {/* Withdrawal Info */}
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
          <YStack flex={1} gap="$1">
            <Text fontSize="$3" color="#3B82F6" fontFamily="$interMedium">
              Minimum withdrawal: {BRIDGE_LIMITS.minimumWithdrawal} USDC
            </Text>
            <Text fontSize="$3" color="#3B82F6" fontFamily="$interMedium">
              Withdrawal fee: ${BRIDGE_FEES.withdrawalFee} USDC (deducted from amount)
            </Text>
            <Text fontSize="$2" color="#3B82F6">
              Withdrawals should arrive within 5 minutes.
            </Text>
          </YStack>
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
              Important: USDC can only be withdrawn to Arbitrum from your Hyperliquid Perpetual
              account. Make sure the recipient address is correct and on the Arbitrum network.
              Withdrawals to incorrect addresses cannot be recovered.
            </Text>
          </YStack>
        </XStack>
      </ScrollView>
    </YStack>
  );
}
