import { AlertTriangle, Copy, ArrowLeft } from '@tamagui/lucide-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Spinner, Text, XStack, YStack } from 'tamagui';
import { toast } from 'sonner-native';
import { DEPOSIT_TOKENS, ChainName, CHAINS } from '@/lib/transfer-fund/constants/deposit-tokens';
import { useActiveWallet } from '@/lib/riverrun/hooks';
import { useUnitDepositAddress } from '@/lib/hyper-unit/hooks/useUnitDepositAddress';
import { useEstimateFees } from '@/lib/hyper-unit/hooks/useEstimateFees';
import { MIN_DEPOSIT_AMOUNTS, type SourceChain, type Asset } from '@/lib/hyper-unit/api';

/**
 * Unit Bridge Page
 *
 * Displays deposit address and instructions for receiving tokens via Unit Protocol
 * Shows minimum deposit amount and important warnings
 */
export default function UnitBridgePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ symbol: string; chain: string }>();

  // Wallet hooks
  const { address: userAddress, isAuthenticated } = useActiveWallet();

  // Find the token based on symbol from URL params
  const token = DEPOSIT_TOKENS.find(t => t.symbol === params.symbol);

  // Find the selected chain configuration
  const selectedChain = token?.supportChains.find(sc => sc.chain === (params.chain as ChainName));

  // Get chain info (with fallback to avoid errors)
  const chainInfo = selectedChain ? CHAINS[selectedChain.chain] : null;

  // Generate deposit address via Unit Protocol (always call hooks at top level)
  const {
    address: depositAddress,
    isLoading,
    error,
  } = useUnitDepositAddress(
    (chainInfo?.unitChainType as SourceChain) || 'bitcoin',
    (token?.symbol.toLowerCase() as Asset) || 'btc',
  );

  // Get fee estimates and deposit ETA
  const { getDepositEtaForChain } = useEstimateFees();

  // Get minimum deposit amount
  const minimumAmount = MIN_DEPOSIT_AMOUNTS[(token?.symbol.toLowerCase() as Asset) || 'btc'] || 0;

  // Get deposit ETA for the current chain
  const depositEta = chainInfo
    ? getDepositEtaForChain(chainInfo.unitChainType as SourceChain)
    : null;

  // Early returns after all hooks
  if (!token || !selectedChain || !chainInfo) {
    return (
      <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
        <Text>Token or chain not found</Text>
      </YStack>
    );
  }

  if (!isAuthenticated || !userAddress) {
    return (
      <YStack flex={1} backgroundColor="$background" paddingTop={insets.top}>
        <Text>Please connect your wallet</Text>
      </YStack>
    );
  }

  const handleCopyAddress = async () => {
    if (!depositAddress) return;

    try {
      await Clipboard.setStringAsync(depositAddress);
      toast.success('Copied!', {
        description: 'Address copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy address:', error);
      toast.error('Failed to copy address');
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
          Receive {token.symbol}
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

        {/* Description */}
        <YStack paddingHorizontal="$4" paddingBottom="$3" gap="$2">
          <Text fontSize="$3" color="$gray11" textAlign="center">
            Use the address below to receive {token.symbol} to your exchange account.
          </Text>
          {depositEta && (
            <XStack alignItems="center" gap="$2" justifyContent="center">
              <Text fontSize="$2" color="$gray10" fontStyle="italic">
                Est. completion time: {depositEta}
              </Text>
            </XStack>
          )}
        </YStack>

        {/* Minimum Amount Warning */}
        <XStack
          marginHorizontal="$4"
          marginBottom="$3"
          padding="$3"
          backgroundColor="rgba(249, 115, 22, 0.1)"
          borderRadius="$3"
          alignItems="center"
          gap="$2"
        >
          <AlertTriangle size={20} color="#F97316" />
          <Text fontSize="$3" color="#F97316">
            Minimum deposit amount: {minimumAmount} {token.symbol}
          </Text>
        </XStack>

        {/* Deposit Address Section */}
        <YStack paddingHorizontal="$4" gap="$3">
          <Text fontSize="$3" color="$gray11" fontFamily="$interMedium">
            Your Deposit Address
          </Text>

          {/* Loading State */}
          {isLoading && (
            <XStack alignItems="center" gap="$2" padding="$3">
              <Spinner size="small" color="$gray10" />
              <Text fontSize="$3" color="$gray11">
                Generating your deposit address...
              </Text>
            </XStack>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <YStack
              backgroundColor="rgba(239, 68, 68, 0.1)"
              borderRadius="$3"
              padding="$3"
              borderWidth={1}
              borderColor="rgba(239, 68, 68, 0.3)"
            >
              <Text fontSize="$3" color="#EF4444">
                {error}
              </Text>
            </YStack>
          )}

          {/* Address Display */}
          {depositAddress && !isLoading && (
            <>
              <YStack
                backgroundColor="$background02"
                borderRadius="$3"
                padding="$3"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <Text fontSize="$2" color="$gray11" marginBottom="$2">
                  Address
                </Text>
                <Text
                  fontSize="$3"
                  fontFamily="$skMono"
                  color="$color"
                  style={{ wordWrap: 'break-word' }}
                >
                  {depositAddress}
                </Text>
              </YStack>

              {/* Copy Button */}
              <Button
                size="$5"
                backgroundColor="#F97316"
                color="white"
                fontFamily="$interSemiBold"
                onPress={handleCopyAddress}
                pressStyle={{ opacity: 0.8 }}
                icon={<Copy size={20} color="white" />}
              >
                Copy Address
              </Button>
            </>
          )}
        </YStack>

        {/* Warning Message */}
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
              Important: Deposits are powered by Unit Protocol. There is a minimum deposit of{' '}
              {minimumAmount} {token.symbol}. This address can only receive {token.symbol} on the{' '}
              {chainInfo.displayName} network. Any other asset (e.g., USDC, USDT) sent from{' '}
              {chainInfo.displayName} will be lost. Deposits below {minimumAmount} {token.symbol}{' '}
              will result in a loss of funds.
            </Text>
          </YStack>
        </XStack>
      </ScrollView>
    </YStack>
  );
}
