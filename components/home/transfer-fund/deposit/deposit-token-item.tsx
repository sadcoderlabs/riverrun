import { ChevronRight } from '@tamagui/lucide-icons';
import { Text, XStack, YStack } from 'tamagui';
import { DepositToken, CHAINS } from '@/lib/riverrun/transfer-fund/constants/deposit-tokens';

export interface DepositTokenItemProps {
  token: DepositToken;
  onPress: () => void;
}

/**
 * Deposit Token Item Component
 *
 * Displays a single token option in the deposit screen
 * Shows token info including symbol, full name, estimated completion time, and default chain
 */
export function DepositTokenItem({ token, onPress }: DepositTokenItemProps) {
  // Get the first supported chain as the default to display
  const defaultChain = token.supportChains[0];
  const chainInfo = CHAINS[defaultChain.chain];

  return (
    <XStack
      paddingVertical="$3.5"
      paddingHorizontal="$4"
      alignItems="center"
      gap="$3"
      backgroundColor="$background"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      pressStyle={{ opacity: 0.7, backgroundColor: '$background02' }}
      onPress={onPress}
      cursor="pointer"
    >
      {/* Token Icon */}
      <XStack
        width={48}
        height={48}
        borderRadius="$12"
        backgroundColor="#3B82F6"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize={24}>{token.icon}</Text>
      </XStack>

      {/* Token Info */}
      <YStack flex={1} gap="$1.5">
        {/* Token Symbol and Full Name */}
        <XStack alignItems="center" gap="$2">
          <Text fontFamily="$interSemiBold" fontSize="$5">
            {token.symbol}
          </Text>
          {token.isRecommended && (
            <XStack
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$2"
              backgroundColor="#F97316"
            >
              <Text fontSize="$2" fontFamily="$interSemiBold" color="white">
                RECOMMENDED
              </Text>
            </XStack>
          )}
        </XStack>

        <Text fontSize="$3" color="$gray11">
          {token.fullName}
        </Text>

        {/* Chain */}
        <Text fontSize="$2" color="$gray10">
          Default Chain: {chainInfo.displayName}
        </Text>
      </YStack>

      {/* Chevron Arrow */}
      <ChevronRight size={20} color="$gray10" />
    </XStack>
  );
}
