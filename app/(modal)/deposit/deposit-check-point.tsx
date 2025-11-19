import { Button, CustomHeader } from '@/app-internal/components/global';
import { CardContainer } from '@/app-internal/components/global/CardContainer';
import { Text } from '@/app-internal/components/global/Text';
import { Copy } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView } from 'react-native';
import { XStack, YStack } from 'tamagui';

/**
 * Deposit Checkpoint Page
 *
 * Pre-deposit screen to help users verify they have the necessary assets
 * on Arbitrum before proceeding with the deposit flow
 */
export default function DepositCheckpointPage() {
  const router = useRouter();

  // Mock data - will be replaced with actual data later
  const mockWalletAddress = '0x123456789';
  const mockUSDCBalance = '0.00';
  const mockETHBalance = '0.00';

  const handleCopyAddress = () => {
    // TODO: Implement copy functionality
    console.log('Copy address');
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
              You&#39;ll need USDC & ETH on Arbitrum
            </Text>
          </YStack>

          {/* Wallet Overview Card */}
          <YStack paddingHorizontal="$4" paddingTop="$2">
            <CardContainer gap="$4">
              {/* Card Title */}
              <Text.Subhead color="$color11" fontWeight="500">
                Your Arbitrum Balance
              </Text.Subhead>

              {/* Asset Balances */}
              <YStack gap="$2">
                {/* USDC Balance */}
                <XStack justifyContent="space-between" alignItems="center">
                  <Text.Subhead color="$color11">USDC</Text.Subhead>
                  <XStack alignItems="baseline" gap="$1">
                    <Text fontSize="$3" fontWeight="500" color="$color12">
                      {mockUSDCBalance}
                    </Text>
                    <Text.Subhead color="$color10">USDC</Text.Subhead>
                  </XStack>
                </XStack>

                {/* ETH Balance */}
                <XStack justifyContent="space-between" alignItems="center">
                  <Text.Subhead color="$color11">ETH</Text.Subhead>
                  <XStack alignItems="baseline" gap="$1">
                    <Text fontSize="$3" fontWeight="500" color="$color12">
                      {mockETHBalance}
                    </Text>
                    <Text.Subhead color="$color10">ETH</Text.Subhead>
                  </XStack>
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
                    fontSize="$4"
                    fontFamily="$skMono"
                    color="$color12"
                    flex={1}
                    numberOfLines={1}
                  >
                    {mockWalletAddress}
                  </Text>
                  <Pressable
                    onPress={handleCopyAddress}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Copy size={18} color="$color11" />
                  </Pressable>
                </XStack>
              </YStack>
            </CardContainer>
          </YStack>
        </ScrollView>

        {/* Continue Button - Fixed at bottom with safe zone padding */}
        <YStack paddingHorizontal="$4" paddingBottom="$4" marginTop="$3">
          <Button.Filled level="lg" height="$5" onPress={handleContinue}>
            Continue
          </Button.Filled>
        </YStack>
      </YStack>
    </YStack>
  );
}
