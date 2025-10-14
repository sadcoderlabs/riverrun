import { Button } from '@/components/global/button';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';

export default function ClosePositionScreen() {
  const { positionId, marginUsed, entryPx, markPrice } = useLocalSearchParams<{
    positionId: string;
    marginUsed?: string;
    entryPx?: string;
    markPrice?: string;
  }>();
  const router = useRouter();

  const handleClose = () => {
    // Logic to close position would go here
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Position Closed', [{ text: 'OK', onPress: () => router.back() }]);
  };

  const handleCancel = () => {
    router.back();
  };

  const formatNumber = (num: string | undefined, decimals = 2) => {
    if (!num) return '-';
    const value = parseFloat(num);
    return !isNaN(value) ? value.toFixed(decimals) : '-';
  };

  return (
    <View flex={1} backgroundColor="$background">
      {/* First box: Title at the top */}
      <YStack padding="$4" borderBottomWidth={1} borderBottomColor="$borderColor">
        <Text fontFamily="$interSemiBold" fontSize="$4" textAlign="center">
          Market Close {positionId}
        </Text>
      </YStack>

      {/* Center content: Second and third boxes */}
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <YStack gap="$6" width="100%" maxWidth={400}>
          {/* Second box: Position data */}
          <YStack
            gap="$3"
            padding="$4"
            backgroundColor="$color2"
            borderRadius="$4"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$3" color="$color9">
                Margin(USD)
              </Text>
              <Text fontSize="$3" fontFamily="$interMedium" color="$color">
                ${formatNumber(marginUsed)}
              </Text>
            </XStack>

            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$3" color="$color9">
                Avg. Entry
              </Text>
              <Text fontSize="$3" fontFamily="$interMedium" color="$color">
                ${formatNumber(entryPx)}
              </Text>
            </XStack>

            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$3" color="$color9">
                Mark Price
              </Text>
              <Text fontSize="$3" fontFamily="$interMedium" color="$color">
                ${formatNumber(markPrice)}
              </Text>
            </XStack>
          </YStack>

          {/* Third box: Action buttons */}
          <YStack gap="$2" width="100%">
            <Button.Filled onPress={handleClose} level="lg">
              Close Position
            </Button.Filled>
            <Button variant="outlined" onPress={handleCancel} level="lg">
              Cancel
            </Button>
          </YStack>
        </YStack>
      </YStack>
    </View>
  );
}
