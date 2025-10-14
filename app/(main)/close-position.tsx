import { Button } from '@/components/global/button';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { Text, View, YStack } from 'tamagui';

export default function ClosePositionScreen() {
  const { positionId } = useLocalSearchParams<{ positionId: string }>();
  const router = useRouter();

  const handleClose = () => {
    // Logic to close position would go here
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Position Closed', [{ text: 'OK', onPress: () => router.back() }]);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}
    >
      <YStack gap="$4" width="100%" maxWidth={400} alignItems="center">
        <Text fontFamily="$interSemiBold" style={{ fontSize: 18 }}>
          Market Close Position
        </Text>
        <Text>Are you sure you want to close position {positionId}?</Text>
        <YStack gap="$2" width="100%">
          <Button.Filled onPress={handleClose}>
            <Text color="white">Close Position</Text>
          </Button.Filled>
          <Button variant="outlined" onPress={handleCancel}>
            <Text>Cancel</Text>
          </Button>
        </YStack>
      </YStack>
    </View>
  );
}
