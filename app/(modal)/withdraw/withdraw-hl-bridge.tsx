import { BRIDGE_FEES, BRIDGE_LIMITS, useBridge, useWallet } from '@/app-internal';
import { Button, CustomHeader } from '@/app-internal/components/global';
import { Input } from '@/app-internal/components/global/Input';
import { Text } from '@/app-internal/components/global/Text';
import { AlertTriangle, ClipboardPaste } from '@tamagui/lucide-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import { toast } from 'sonner-native';
import { Spinner, XStack, YStack } from 'tamagui';

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
        <Text color="$color12">Please connect your wallet</Text>
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
      <CustomHeader title="Withdraw" />

      {/* Main Content Area - Flex to push submit section to bottom */}
      <YStack flex={1} justifyContent="space-between">
        {/* Scrollable Content */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          {/* Balance & Policy Display Section */}
          <YStack paddingHorizontal="$4" paddingTop="$4" gap="$2">
            <XStack padding="$3" marginTop="$3" backgroundColor="$gray2" borderRadius="$3">
              <YStack flex={1} gap="$2">
                <XStack alignItems="center" justifyContent="space-between">
                  <Text.Footnote color="$color10">Withdrawable</Text.Footnote>
                  <Text.Footnote color="$color12" fontWeight="500">
                    {isLoadingBalance ? (
                      <Spinner size="small" color="$color12" />
                    ) : (
                      <XStack alignItems="baseline" gap="$1">
                        <Text.Footnote color="$color12" fontWeight="500">
                          {withdrawableBalance || '0.000000'}
                        </Text.Footnote>
                        <Text.Footnote color="$color10" marginLeft="$1">
                          USDC
                        </Text.Footnote>
                      </XStack>
                    )}
                  </Text.Footnote>
                </XStack>
                <XStack alignItems="center" justifyContent="space-between">
                  <Text.Footnote color="$color10">Minimum</Text.Footnote>
                  <Text.Footnote color="$color12" fontWeight="500">
                    {BRIDGE_LIMITS.minimumWithdrawal} USDC
                  </Text.Footnote>
                </XStack>
                <XStack alignItems="center" justifyContent="space-between">
                  <Text.Footnote color="$color10">Fee(deducted from withdrawals)</Text.Footnote>
                  <Text.Footnote color="$color12" fontWeight="500">
                    {BRIDGE_FEES.withdrawalFee} USDC
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

          {/* Withdrawal Details Section */}
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
                  amount && (numAmount <= 0 || numAmount > numBalance) ? '$red9' : '$borderColor'
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
                  editable={!isWithdrawing}
                />
                <XStack gap="$2" alignItems="center">
                  <Pressable onPress={handleMaxPress} disabled={isWithdrawing}>
                    <XStack
                      backgroundColor="$gray5"
                      paddingVertical="$1"
                      paddingHorizontal="$2"
                      borderRadius="$1"
                    >
                      <Text
                        fontSize="$2"
                        color={isWithdrawing ? '$color9' : '$color12'}
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
              {amount && numAmount > 0 && numAmount < BRIDGE_LIMITS.minimumWithdrawal && (
                <Text.Footnote color="$red9">
                  Minimum withdrawal amount: {BRIDGE_LIMITS.minimumWithdrawal} USDC
                </Text.Footnote>
              )}
              {amount && numAmount > numBalance && (
                <Text.Footnote color="$red9">Insufficient balance</Text.Footnote>
              )}
            </YStack>
            {/* Address Input */}
            <YStack gap="$2" marginTop="$3">
              <Text.Subhead color="$color11">Withdraw To</Text.Subhead>

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
                  placeholder="Enter an Arbitrum address"
                  placeholderTextColor="$gray10"
                  value={recipientAddress}
                  onChangeText={setRecipientAddress}
                  fontFamily="$skMono"
                  fontSize="$3"
                  backgroundColor="transparent"
                  borderWidth={0}
                  paddingVertical="$2"
                  editable={!isWithdrawing}
                />
                <Pressable
                  onPress={handlePasteAddress}
                  disabled={isWithdrawing}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={({ pressed }) => ({
                    backgroundColor: '$accent9',
                    paddingHorizontal: 8,
                    paddingVertical: 8,
                    borderRadius: 6,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <ClipboardPaste size={18} color="$color11" />
                </Pressable>
              </XStack>
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
                  Heads Up!
                </Text.Footnote>
                <XStack gap="$2" alignItems="flex-start">
                  <Text.Caption color="$yellow9">•</Text.Caption>
                  <Text.Footnote color="$yellow9">
                    Withdrawals go to Arbitrum network only
                  </Text.Footnote>
                </XStack>
                <XStack gap="$2" alignItems="flex-start">
                  <Text.Caption color="$yellow9">•</Text.Caption>
                  <Text.Footnote color="$yellow9">Double-check the withdraw address</Text.Footnote>
                </XStack>
                <XStack gap="$2" alignItems="flex-start">
                  <Text.Caption color="$yellow9">•</Text.Caption>
                  <Text.Footnote color="$yellow9">
                    Funds sent to incorrect addresses cannot be recovered
                  </Text.Footnote>
                </XStack>
              </YStack>
            </YStack>
          </XStack>
          <Button.Filled
            level="lg"
            height="$5"
            onPress={handleWithdraw}
            disabled={!isValidAmount || !isValidRecipient || !amount || isWithdrawing}
            opacity={!isValidAmount || !isValidRecipient || !amount || isWithdrawing ? 0.5 : 1}
            marginTop="$3"
            icon={isWithdrawing ? <Spinner size="small" color="$color1" /> : undefined}
          >
            {isWithdrawing ? 'Processing...' : 'Confirm'}
          </Button.Filled>
        </YStack>
      </YStack>
    </YStack>
  );
}
