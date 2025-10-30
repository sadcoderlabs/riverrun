import { AlertTriangle, ArrowLeft, ClipboardPaste, Info } from '@tamagui/lucide-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Input, Spinner, Text, XStack, YStack } from 'tamagui';
import { toast } from 'sonner-native';
import { useActiveWallet } from '@/hooks/useActiveWallet';
import { useUnitWithdrawalAddress } from '@/lib/hyper-unit/hooks/useUnitWithdrawalAddress';
import { useSpotBalance } from '@/hooks/useSpotBalance';
import { useSpotSend } from '@/hooks/useSpotSend';
import { useEstimateFees } from '@/lib/hyper-unit/hooks/useEstimateFees';
import type { DestinationChain, Asset } from '@/lib/hyper-unit/api';

// Validate Ethereum/Bitcoin/Solana address format
function isValidAddress(address: string, network: string): boolean {
  if (network === 'ethereum') {
    // Ethereum address: 0x + 40 hex chars
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  } else if (network === 'bitcoin') {
    // Bitcoin address: starts with 1, 3, or bc1
    return /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
  } else if (network === 'solana') {
    // Solana address: base58, 32-44 chars
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }
  return false;
}

// Token configurations
const TOKEN_INFO: Record<
  string,
  {
    fullName: string;
    icon: string;
    network: string;
    minWithdrawal: number;
    spotTokenName: string;
  }
> = {
  ETH: {
    fullName: 'Ethereum',
    icon: 'Ξ',
    network: 'ethereum',
    minWithdrawal: 0.05,
    spotTokenName: 'UETH', // Hyperliquid uses UETH for ETH spot token
  },
  BTC: {
    fullName: 'Bitcoin',
    icon: '₿',
    network: 'bitcoin',
    minWithdrawal: 0.002,
    spotTokenName: 'UBTC', // Hyperliquid likely uses UBTC for BTC spot token
  },
  SOL: {
    fullName: 'Solana',
    icon: '◎',
    network: 'solana',
    minWithdrawal: 0.2,
    spotTokenName: 'USOL', // Hyperliquid likely uses USOL for SOL spot token
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

  // Get spot balance for the token (use Hyperliquid token name)
  const {
    balance,
    tokenInfo: spotTokenInfo,
    isLoading: isBalanceLoading,
    refreshBalance,
  } = useSpotBalance(tokenInfo?.spotTokenName || '');

  // Get Unit withdrawal address (will generate when recipient address is valid)
  const isRecipientValid =
    recipientAddress.length > 0 && tokenInfo && isValidAddress(recipientAddress, tokenInfo.network);

  const {
    address: unitWithdrawalAddress,
    isLoading: isAddressLoading,
    error: addressError,
  } = useUnitWithdrawalAddress(
    isRecipientValid ? (tokenInfo!.network as DestinationChain) : null,
    isRecipientValid ? (params.symbol?.toLowerCase() as Asset) : null,
    isRecipientValid ? recipientAddress : null,
  );

  // Get spotSend hook
  const { send: spotSend, isSending } = useSpotSend();

  // Get fee estimates and withdrawal ETA
  const { estimates, isLoading: isFeesLoading, getWithdrawalEtaForChain } = useEstimateFees();

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

  // Get withdrawal ETA for the current chain
  const withdrawalEta = tokenInfo
    ? getWithdrawalEtaForChain(tokenInfo.network as DestinationChain)
    : null;

  const handleMaxPress = () => {
    if (balance) {
      setAmount(balance);
    }
  };

  const handlePasteAddress = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      setRecipientAddress(text);
    } catch {
      toast.error('Failed to paste address');
    }
  };

  const handleWithdraw = async () => {
    if (!isValidAmount || !isRecipientValid) {
      Alert.alert('Invalid Input', 'Please enter valid recipient address and amount');
      return;
    }

    if (!unitWithdrawalAddress) {
      Alert.alert('Error', 'Failed to generate withdrawal address. Please try again.');
      return;
    }

    if (!spotTokenInfo?.tokenId) {
      Alert.alert('Error', 'Token information not available. Please try again.');
      return;
    }

    try {
      // Construct token identifier in format "NAME:TOKEN_ID"
      const tokenIdentifier = `${spotTokenInfo.name}:${spotTokenInfo.tokenId}`;

      // Execute spotSend to Unit withdrawal address
      const success = await spotSend(unitWithdrawalAddress, tokenIdentifier, amount);

      if (success) {
        const etaMessage = withdrawalEta
          ? `Your ${params.symbol} will arrive in approximately ${withdrawalEta}`
          : `Withdrawal initiated for ${params.symbol}`;

        toast.success('Withdrawal Initiated!', {
          description: etaMessage,
        });

        // Refresh balance after successful withdrawal
        await refreshBalance();

        // Clear form
        setAmount('');
        setRecipientAddress('');
      }
    } catch (err) {
      Alert.alert(
        'Withdrawal Failed',
        err instanceof Error ? err.message : 'Unknown error occurred',
      );
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
              editable={!isSending}
            />
            <Pressable
              onPress={handlePasteAddress}
              disabled={isSending}
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

          {/* Address Validation Feedback */}
          {recipientAddress.length > 0 && !isRecipientValid && (
            <XStack alignItems="center" gap="$2" marginTop="$2">
              <AlertTriangle size={16} color="#F97316" />
              <Text fontSize="$2" color="#F97316" fontFamily="$interMedium">
                Invalid {tokenInfo.network} address format
              </Text>
            </XStack>
          )}

          {/* Show loading state for withdrawal address generation */}
          {isAddressLoading && (
            <XStack alignItems="center" gap="$2" marginTop="$2">
              <Spinner size="small" color="$gray11" />
              <Text fontSize="$2" color="$gray11">
                Generating withdrawal address...
              </Text>
            </XStack>
          )}

          {/* Show error if address generation failed */}
          {addressError && (
            <XStack alignItems="center" gap="$2" marginTop="$2">
              <AlertTriangle size={16} color="#F97316" />
              <Text fontSize="$2" color="#F97316" fontFamily="$interMedium">
                {addressError}
              </Text>
            </XStack>
          )}
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
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$3" color="$gray11">
              Amount
            </Text>
            <Text fontSize="$2" color="$gray10" fontStyle="italic">
              Min: {tokenInfo.minWithdrawal} {params.symbol}
            </Text>
          </XStack>

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
                editable={!isSending && !isBalanceLoading}
              />
              <XStack gap="$2" alignItems="center">
                <Pressable onPress={handleMaxPress} disabled={isSending || isBalanceLoading}>
                  <Text
                    fontSize="$3"
                    color={isSending || isBalanceLoading ? '$gray10' : '#F97316'}
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
                  Amount must be at least {tokenInfo.minWithdrawal} {params.symbol}
                </Text>
              </XStack>
            )}
            {amount && numAmount > numBalance && (
              <XStack alignItems="center" gap="$2">
                <AlertTriangle size={16} color="#F97316" />
                <Text fontSize="$2" color="#F97316" fontFamily="$interMedium">
                  Insufficient balance
                </Text>
              </XStack>
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
            disabled={
              !isValidAmount ||
              !isRecipientValid ||
              !amount ||
              isSending ||
              isBalanceLoading ||
              isAddressLoading ||
              !unitWithdrawalAddress
            }
            opacity={
              !isValidAmount ||
              !isRecipientValid ||
              !amount ||
              isSending ||
              isBalanceLoading ||
              isAddressLoading ||
              !unitWithdrawalAddress
                ? 0.5
                : 1
            }
            pressStyle={{ opacity: 0.8 }}
            marginTop="$3"
            icon={isSending ? <Spinner size="small" color="$color" /> : undefined}
          >
            {isSending ? 'Processing...' : 'Withdraw'}
          </Button>
        </YStack>

        {/* Withdrawal Information */}
        {!isFeesLoading && estimates && (
          <XStack
            marginHorizontal="$4"
            marginTop="$4"
            padding="$3"
            backgroundColor="rgba(59, 130, 246, 0.1)"
            borderRadius="$3"
            gap="$3"
          >
            <Info size={20} color="#3B82F6" style={{ marginTop: 2 }} />
            <YStack flex={1} gap="$1">
              <Text fontSize="$2" color="#3B82F6" lineHeight="$1">
                Network costs will be deducted from your withdrawal amount
              </Text>
              {withdrawalEta && (
                <Text fontSize="$2" color="#3B82F6" lineHeight="$1">
                  Expected arrival time: {withdrawalEta}
                </Text>
              )}
            </YStack>
          </XStack>
        )}

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
