import { useBridge, useWallet } from '@/app-internal';
import { Button, CustomHeader } from '@/app-internal/components/global';
import { CardContainer } from '@/app-internal/components/global/CardContainer';
import { Text } from '@/app-internal/components/global/Text';
import { AlertTriangle, Copy, QrCode, X } from '@tamagui/lucide-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView } from 'react-native';
import { toast } from 'sonner-native';
import { Spinner, XStack, YStack } from 'tamagui';

// Helper function to shorten address (first 5 and last 5 characters)
function shortenAddress(address: string, chars: number = 5): string {
  if (!address || address.length < chars * 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Deposit Checkpoint Page
 *
 * Pre-deposit screen to help users verify they have the necessary assets
 * on Arbitrum before proceeding with the deposit flow
 */
export default function DepositCheckpointPage() {
  const router = useRouter();

  // Wallet and bridge hooks
  const { wallet } = useWallet();
  const { arbitrumBalance, arbitrumEthBalance, refreshBalances, isLoadingBalances } = useBridge();

  // QR code modal state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeUri, setQrCodeUri] = useState<string | null>(null);

  // Validation constants
  const MINIMUM_ETH = 0;
  const MINIMUM_USDC = 5;

  // Parse balances
  const numUSDCBalance = parseFloat(arbitrumBalance || '0');
  const numETHBalance = parseFloat(arbitrumEthBalance || '0');

  // Check if user can continue
  const hasEnoughETH = numETHBalance > MINIMUM_ETH;
  const hasEnoughUSDC = numUSDCBalance >= MINIMUM_USDC;
  const canContinue = hasEnoughETH && hasEnoughUSDC;

  // Determine warning message
  const getWarningMessage = () => {
    if (!hasEnoughETH && !hasEnoughUSDC) {
      return 'ETH required for gas fees and minimum 5 USDC needed to proceed';
    }
    if (!hasEnoughETH) {
      return 'ETH required for gas fees to proceed';
    }
    if (!hasEnoughUSDC) {
      return 'Minimum 5 USDC required to proceed';
    }
    return '';
  };

  // Refresh balances on mount
  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  // Pre-generate QR code on mount
  useEffect(() => {
    if (wallet?.address) {
      const uri = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${wallet.address}`;
      setQrCodeUri(uri);
      // Preload the image
      Image.prefetch(uri);
    }
  }, [wallet?.address]);

  const handleCopyAddress = async () => {
    if (!wallet) return;

    try {
      await Clipboard.setStringAsync(wallet.address);
      toast.success('Copied!', {
        description: 'Wallet address copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy address:', error);
      toast.error('Failed to copy address');
    }
  };

  const handleContinue = () => {
    // Navigate to hl-bridge
    router.navigate({
      pathname: '/(modal)/deposit/deposit-hl-bridge',
      params: {
        symbol: 'USDC',
        chain: 'arbitrum',
      },
    });
  };

  // Show loading or error state if wallet is not connected
  if (!wallet) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <CustomHeader title="Deposit 1/2" />
        <YStack flex={1} justifyContent="center" alignItems="center" paddingHorizontal="$4">
          <Text color="$color12" textAlign="center">
            Please connect your wallet
          </Text>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <CustomHeader title="Deposit 1/2" />

      {/* Main Content Area - Flex to push button to bottom */}
      <YStack flex={1} justifyContent="space-between">
        {/* Scrollable Content */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          {/* Instruction Heading */}
          <YStack paddingHorizontal="$4" paddingTop="$6" paddingBottom="$4">
            <Text textAlign="center" color="$color12" fontSize="$4">
              USDC & ETH on Arbitrum Required
            </Text>
          </YStack>

          {/* Wallet Overview Card */}
          <YStack paddingHorizontal="$4" paddingTop="$2">
            <CardContainer gap="$4">
              {/* Card Title */}
              <Text.Subhead color="$color11">Your Arbitrum Balance</Text.Subhead>

              {/* Asset Balances */}
              <YStack gap="$2">
                {/* USDC Balance */}
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack alignItems="center" gap="$2">
                    <Image
                      source={require('@/app-internal/assets/images/arbitrum.png')}
                      style={{ width: 16, height: 16 }}
                    />
                    <Text.Subhead color="$color11">USDC</Text.Subhead>
                  </XStack>
                  {isLoadingBalances ? (
                    <Spinner size="small" color="$color12" />
                  ) : (
                    <XStack alignItems="baseline" gap="$1">
                      <Text fontSize="$3" fontWeight="500" color="$color12">
                        {arbitrumBalance || '0.00'}
                      </Text>
                      <Text.Subhead color="$color10">USDC</Text.Subhead>
                    </XStack>
                  )}
                </XStack>

                {/* ETH Balance */}
                <XStack justifyContent="space-between" alignItems="center">
                  <XStack alignItems="center" gap="$2">
                    <Image
                      source={require('@/app-internal/assets/images/arbitrum.png')}
                      style={{ width: 16, height: 16 }}
                    />
                    <Text.Subhead color="$color11">ETH</Text.Subhead>
                  </XStack>
                  {isLoadingBalances ? (
                    <Spinner size="small" color="$color12" />
                  ) : (
                    <XStack alignItems="baseline" gap="$1">
                      <Text fontSize="$3" fontWeight="500" color="$color12">
                        {arbitrumEthBalance || '0.00'}
                      </Text>
                      <Text.Subhead color="$color10">ETH</Text.Subhead>
                    </XStack>
                  )}
                </XStack>
              </YStack>

              {/* Divider */}
              <YStack height={1} backgroundColor="$borderColor" />

              {/* Wallet Address */}
              <YStack gap="$2">
                <Text.Subhead color="$color11">Wallet Address</Text.Subhead>
                <XStack
                  backgroundColor="$gray2"
                  borderRadius="$3"
                  padding="$3"
                  alignItems="center"
                  justifyContent="space-between"
                  gap="$2"
                >
                  <Text
                    fontFamily="$skMono"
                    fontSize="$3"
                    color="$color12"
                    flex={1}
                    numberOfLines={1}
                  >
                    {shortenAddress(wallet.address, 6)}
                  </Text>
                  <XStack gap="$3">
                    <Pressable
                      onPress={() => setShowQRModal(true)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <QrCode size={18} color="$color11" />
                    </Pressable>
                    <Pressable
                      onPress={handleCopyAddress}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Copy size={18} color="$color11" />
                    </Pressable>
                  </XStack>
                </XStack>
              </YStack>
            </CardContainer>
          </YStack>
        </ScrollView>

        {/* Warning and Continue Button - Fixed at bottom with safe zone padding */}
        <YStack paddingHorizontal="$4" paddingBottom="$4" marginTop="$3" gap="$3">
          {/* Warning Message */}
          {!canContinue && (
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
                    Insufficient Balance
                  </Text.Footnote>
                  <Text.Footnote color="$yellow9">{getWarningMessage()}</Text.Footnote>
                </YStack>
              </YStack>
            </XStack>
          )}

          {/* Continue Button */}
          <Button.Filled
            level="lg"
            height="$5"
            onPress={handleContinue}
            disabled={!canContinue}
            opacity={!canContinue ? 0.5 : 1}
          >
            Continue
          </Button.Filled>
        </YStack>
      </YStack>

      {/* QR Code Modal */}
      <Modal
        visible={showQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          onPress={() => setShowQRModal(false)}
        >
          <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
            <Pressable onPress={e => e.stopPropagation()}>
              <YStack
                backgroundColor="$background"
                borderRadius="$4"
                padding="$5"
                gap="$4"
                alignItems="center"
                minWidth={300}
              >
                {/* Close Button */}
                <XStack width="100%" justifyContent="flex-end">
                  <Pressable
                    onPress={() => setShowQRModal(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={24} color="$color11" />
                  </Pressable>
                </XStack>

                {/* QR Code */}
                <YStack backgroundColor="white" padding="$3" borderRadius="$3" alignItems="center">
                  {qrCodeUri && (
                    <Image source={{ uri: qrCodeUri }} style={{ width: 200, height: 200 }} />
                  )}
                </YStack>

                {/* Wallet Address */}
                <YStack gap="$2" width="100%">
                  <Text.Subhead color="$color11" textAlign="center">
                    Wallet Address
                  </Text.Subhead>
                  <XStack
                    backgroundColor="$gray2"
                    borderRadius="$3"
                    padding="$3"
                    gap="$2"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Text
                      fontFamily="$skMono"
                      fontSize="$3"
                      color="$color12"
                      flex={1}
                      numberOfLines={1}
                    >
                      {shortenAddress(wallet?.address || '', 6)}
                    </Text>
                    <Pressable
                      onPress={handleCopyAddress}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Copy size={18} color="$color11" />
                    </Pressable>
                  </XStack>
                </YStack>
              </YStack>
            </Pressable>
          </YStack>
        </Pressable>
      </Modal>
    </YStack>
  );
}
